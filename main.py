"""
SentinelEdge - Lightweight Autonomous Edge IDPS with AI Agents & Neurons
Main Executable Launcher
"""

import os
import sys
import uvicorn

if __name__ == "__main__":
    print("=" * 75)
    print("           SENTINEL EDGE - LIGHTWEIGHT EDGE IDPS ENGINE")
    print("      Tier 1: Suricata & Snort Fast Wire Filter (.rules)")
    print("      Tier 2: Sentinel AI Agent (Port Dispersion & Flow Profiler)")
    print("      Tier 3: The Neurons (Multi-Layer Deep Neural Network)")
    print("      Tier 4: Autonomous Tri-State Response Engine (Dynamic IP Jail)")
    print("=" * 75)
    print("\n[+] Edge Router Tap Interface: ACTIVE")
    print("[+] SQLite WAL Forensic Database: ACTIVE")
    print("[+] Realistic Traffic & Threat Simulator: READY")
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    print(f"\n>>> Launching SentinelEdge SOC Dashboard on http://{host}:{port} <<<\n")

    from dashboard.server import app
    uvicorn.run(app, host=host, port=port, log_level="warning")
