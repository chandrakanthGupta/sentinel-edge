"""
SentinelEdge Core Orchestrator
Connects Tier 1 (Suricata/Snort Wire Filter) -> Tier 2 (AI Agent) ->
Tier 3 (Neurons DNN) -> Tier 4 (Autonomous Response & DB).
"""

import time
import psutil
from typing import Dict, Any, List

from tier1_wire_filter.engine import Tier1WireFilter
from tier2_agent.agent import SentinelAIAgent
from tier3_neurons.neurons import NeuronsDeepClassifier
from tier4_response.database import IncidentDatabase
from tier4_response.response_engine import AutonomousResponseEngine

class SentinelEdgeCore:
    def __init__(self):
        print("[SentinelEdge] Booting Edge IDPS Engine...")
        self.t1_filter = Tier1WireFilter()
        self.t2_agent = SentinelAIAgent()
        self.t3_neurons = NeuronsDeepClassifier()
        self.db = IncidentDatabase()
        self.t4_response = AutonomousResponseEngine(self.db)
        
        # Performance counters
        self.total_packets_inspected = 0
        self.total_forwarded = 0
        self.total_blocked = 0
        self.total_quarantined = 0
        self.total_heavy_transfers_cleared = 0
        self.cumulative_latency_ms = 0.0
        print("[SentinelEdge] Core Engine Online & Protecting Edge.")

    def process_packet(self, packet: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes end-to-end multi-tier inspection for a single packet.
        """
        t_global_start = time.perf_counter()
        self.total_packets_inspected += 1

        # Check early if source IP is already in dynamic blocklist
        src_ip = packet.get("src_ip", "0.0.0.0")
        is_blocked, remaining = self.t4_response.is_ip_blocked(src_ip)
        if is_blocked:
            total_lat = (time.perf_counter() - t_global_start) * 1000.0
            self.total_blocked += 1
            self.cumulative_latency_ms += total_lat
            return {
                "packet": packet,
                "tier1": {"status": "BLOCKED_AT_WIRE", "msg": f"Active Firewall Ban ({remaining}s remaining)", "latency_us": 2.1},
                "agent": {"agent_anomaly_score": 1.0, "is_single_port_heavy": False, "is_port_scan_pattern": True, "features": {}},
                "neurons": {"neuron_class": "BLOCKED_BY_FIREWALL", "neuron_confidence": 100.0, "probabilities": {}},
                "decision": {"action": "BLOCKED", "reason": f"Active Firewall Ban ({remaining}s remaining)", "ban_duration": remaining, "is_active_ban": True},
                "total_latency_ms": round(total_lat, 3)
            }

        # Step 1: Tier 1 - Suricata & Snort Fast-Path Filter
        t1_res = self.t1_filter.inspect_packet(packet)

        # Step 2: Tier 2 - Sentinel AI Agent
        t2_res = self.t2_agent.process(packet, t1_res)

        # Step 3: Tier 3 - The Neurons Deep Neural Network
        t3_res = self.t3_neurons.evaluate(packet, t1_res, t2_res)

        # Step 4: Tier 4 - Autonomous Tri-State Response Engine
        t4_res = self.t4_response.decide_and_act(packet, t1_res, t2_res, t3_res)

        # Update metrics
        if t4_res["action"] == "FORWARDED":
            self.total_forwarded += 1
            if t2_res.get("is_single_port_heavy"):
                self.total_heavy_transfers_cleared += 1
        elif t4_res["action"] == "BLOCKED":
            self.total_blocked += 1
        elif t4_res["action"] == "QUARANTINED":
            self.total_quarantined += 1

        total_lat = (time.perf_counter() - t_global_start) * 1000.0
        self.cumulative_latency_ms += total_lat

        return {
            "packet": packet,
            "tier1": t1_res,
            "agent": t2_res,
            "neurons": t3_res,
            "decision": t4_res,
            "total_latency_ms": round(total_lat, 3)
        }

    def get_system_telemetry(self) -> Dict[str, Any]:
        """
        Returns real edge hardware KPIs (RAM, CPU, Average wire latency).
        """
        process = psutil.Process()
        mem_info = process.memory_info()
        mem_mb = round(mem_info.rss / (1024 * 1024), 2)
        cpu_pct = round(process.cpu_percent(interval=None), 1)
        
        avg_lat = round(
            self.cumulative_latency_ms / max(1, self.total_packets_inspected), 3
        )

        active_bans = self.db.get_active_blocklist()

        return {
            "total_packets": self.total_packets_inspected,
            "forwarded": self.total_forwarded,
            "blocked": self.total_blocked,
            "quarantined": self.total_quarantined,
            "genuine_heavy_transfers_cleared": self.total_heavy_transfers_cleared,
            "active_bans_count": len(active_bans),
            "avg_latency_ms": avg_lat,
            "edge_ram_mb": mem_mb,
            "edge_cpu_percent": cpu_pct
        }
