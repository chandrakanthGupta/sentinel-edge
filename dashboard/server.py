"""
SentinelEdge - FastAPI Live SOC Dashboard Server
Serves the real-time web dashboard, WebSocket live packet stream,
REST APIs for incidents, active blocklist, telemetry, and manual demo triggers.
"""

import os
import sys
import json
import asyncio
from typing import Dict, Any, List, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sentinel_core import SentinelEdgeCore
from simulation.traffic_generator import ContinuousTrafficGenerator

app = FastAPI(title="SentinelEdge Dashboard")

# Enable CORS for external frontends (e.g., Vercel, localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Engine & Traffic Generator
sentinel = SentinelEdgeCore()
generator = ContinuousTrafficGenerator()

# Connected WebSocket clients
connected_clients: Set[WebSocket] = set()

# Event loop reference for background callbacks
main_loop: asyncio.AbstractEventLoop = None

def broadcast_packet_event(packet_result: Dict[str, Any]):
    """Called by the traffic generator thread whenever a packet is processed."""
    global main_loop, connected_clients
    if not connected_clients or not main_loop:
        return

    # Prepare lightweight payload for UI
    p = packet_result["packet"]
    t1 = packet_result["tier1"]
    t2 = packet_result["agent"]
    t3 = packet_result["neurons"]
    dec = packet_result["decision"]

    ui_event = {
        "type": "PACKET_INSPECTED",
        "timestamp": p.get("timestamp", None),
        "src_ip": p.get("src_ip"),
        "dst_ip": p.get("dst_ip"),
        "src_port": p.get("src_port"),
        "dst_port": p.get("dst_port"),
        "protocol": p.get("protocol"),
        "subnet": p.get("subnet"),
        "sim_type": p.get("sim_type", "TRAFFIC"),
        "tier1_status": t1.get("status"),
        "tier1_msg": t1.get("msg"),
        "tier1_sid": t1.get("sid"),
        "agent_score": t2.get("agent_anomaly_score"),
        "is_single_port_heavy": t2.get("is_single_port_heavy"),
        "is_port_scan_pattern": t2.get("is_port_scan_pattern"),
        "neuron_class": t3.get("neuron_class"),
        "neuron_confidence": t3.get("neuron_confidence"),
        "decision_action": dec.get("action"),
        "decision_reason": dec.get("reason"),
        "ban_duration": dec.get("ban_duration", 0),
        "is_active_ban": dec.get("is_active_ban", False),
        "total_latency_ms": packet_result.get("total_latency_ms", 0.0),
        "telemetry": sentinel.get_system_telemetry()
    }

    data_str = json.dumps(ui_event)
    for ws in list(connected_clients):
        try:
            asyncio.run_coroutine_threadsafe(ws.send_text(data_str), main_loop)
        except Exception:
            pass

def on_traffic_packet(pkt: Dict[str, Any]):
    # Process through the 4-tier pipeline
    result = sentinel.process_packet(pkt)
    broadcast_packet_event(result)

# Wire generator callback to SentinelEdge
generator.on_packet_callback = on_traffic_packet

@app.on_event("startup")
async def startup_event():
    global main_loop
    main_loop = asyncio.get_running_loop()
    # Start continuous background simulation at steady 0.25s cadence
    generator.start_continuous(interval_sec=0.25)
    print("[Dashboard Server] Startup complete. Continuous stream active.")

@app.on_event("shutdown")
async def shutdown_event():
    generator.stop_continuous()
    print("[Dashboard Server] Shutdown complete.")

# --- REST Endpoints ---

@app.get("/api/telemetry")
def get_telemetry():
    return sentinel.get_system_telemetry()

@app.get("/api/incidents")
def get_incidents(limit: int = 50):
    return sentinel.db.get_recent_incidents(limit=limit)

@app.get("/api/incident/{incident_id}")
def get_incident_detail(incident_id: int):
    inc = sentinel.db.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@app.get("/api/blocklist")
def get_blocklist():
    return sentinel.db.get_active_blocklist()

@app.post("/api/unblock/{ip}")
def unblock_ip(ip: str):
    sentinel.db.remove_from_blocklist(ip)
    if ip in sentinel.t4_response.blocklist_cache:
        del sentinel.t4_response.blocklist_cache[ip]
    return {"status": "success", "message": f"IP {ip} released from blocklist"}

@app.post("/api/simulate/burst/{attack_type}")
def trigger_simulation_burst(attack_type: str, count: int = 8):
    if attack_type not in ("port_scan", "heavy_transfer", "exploit", "normal"):
        raise HTTPException(status_code=400, detail="Invalid attack type")
    generator.trigger_burst(attack_type, count=count)
    return {"status": "triggered", "attack_type": attack_type, "count": count}

@app.post("/api/simulation/toggle")
def toggle_simulation():
    if generator.running:
        generator.stop_continuous()
        return {"status": "paused", "running": False}
    else:
        generator.start_continuous(interval_sec=0.25)
        return {"status": "running", "running": True}

@app.get("/api/export_pcap/{incident_id}")
def export_pcap(incident_id: int):
    """Generates and serves a standard Wireshark-compatible PCAP file for an incident."""
    inc = sentinel.db.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Generate synthetic PCAP binary format
    # PCAP Global Header: 24 bytes (magic 0xa1b2c3d4, version 2.4, etc.)
    pcap_magic = bytes.fromhex("d4c3b2a10200040000000000000000000000040001000000")
    
    # Packet header: 16 bytes (ts_sec, ts_usec, incl_len, orig_len)
    now_int = int(inc.get("timestamp", 0))
    ts_sec = now_int.to_bytes(4, byteorder='little')
    ts_usec = (0).to_bytes(4, byteorder='little')
    
    # Construct minimal raw ethernet/IP/TCP payload
    raw_hex = inc.get("payload_hex", "")
    try:
        payload_bytes = bytes.fromhex(raw_hex) if raw_hex else b"SentinelEdge Incident Packet"
    except Exception:
        payload_bytes = b"SentinelEdge Incident Packet"

    # Minimal 54-byte Ethernet + IPv4 + TCP header
    header_bytes = b"\x00\x0c\x29\x12\x34\x56\x00\x0c\x29\xab\xcd\xef\x08\x00" + (b"\x00" * 40)
    full_frame = header_bytes + payload_bytes
    frame_len = len(full_frame)
    len_bytes = frame_len.to_bytes(4, byteorder='little')
    
    packet_header = ts_sec + ts_usec + len_bytes + len_bytes
    pcap_data = pcap_magic + packet_header + full_frame

    filename = f"sentinel_incident_{incident_id}_{inc.get('neuron_class', 'alert')}.pcap"
    return Response(
        content=pcap_data,
        media_type="application/vnd.tcpdump.pcap",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        # Send initial state
        init_data = {
            "type": "INITIAL_STATE",
            "telemetry": sentinel.get_system_telemetry(),
            "blocklist": sentinel.db.get_active_blocklist(),
            "recent_incidents": sentinel.db.get_recent_incidents(limit=15)
        }
        await websocket.send_text(json.dumps(init_data))
        while True:
            # Keepalive listener
            msg = await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
    except Exception:
        if websocket in connected_clients:
            connected_clients.remove(websocket)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    print(f"[SentinelEdge] Launching Dashboard on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="warning")
