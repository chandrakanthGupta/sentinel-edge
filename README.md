# SENTINEL EDGE (Autonomous Lightweight Edge IDPS & Forensics)

> **Hackathon Edition**: Mid-Enterprise & Campus Network Edge Defense Engine  
> **Key Innovation**: Dual Suricata/Snort Fast Wire Filter + Sentinel AI Agent + Multi-Layer Neurons (DNN) + Tri-State Autonomous Response.

---

## 🚀 1-Minute Quick Start

To launch the SentinelEdge engine and open the real-time SOC dashboard:

```bash
# 1. Navigate to the project directory
cd "C:\Users\sivas\Desktop\anti2"
# or
cd "C:\Users\sivas\Desktop\innosprit hacktoon"

# 2. Run the main executable
python main.py
```

Now open your web browser at:
👉 **`http://127.0.0.1:8000`**

---

## 🧠 Architecture Overview (Mapped to System Flow)

```
                       [ Incoming Packet Stream ]
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 1: SURICATA & SNORT FAST WIRE FILTER                              │
│ - Snort & Suricata Rule Matcher (.rules engine: CVEs, SIDs, exploits)  │
│ - Stateless flag & threshold inspector (Xmas, NULL, SYN bursts)        │
│ - Wire-speed filter: clean packets bypass to destination instantly     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (Flagged / Ambiguous Traffic)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 2: SENTINEL AI AGENT                                              │
│ - Flow Aggregator & Port Dispersion Profiler                           │
│ - Distinguishes Genuine Heavy Transfers vs Empty-Port Scans            │
│ - Computes 10-feature normalized vector (CIC-IDS2017 schema)           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ (Calculated Feature Vector)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 3: THE NEURONS (DNN)                                              │
│ - Multi-Layer Neural Network (Input 10 -> 32 -> 16 -> 5 Classes)       │
│ - Deep Non-Linear Pattern Matching & Softmax Probabilities             │
│ - Classes: Benign Normal, Heavy Transfer, Port Scan, DDoS, Exploit     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 4: AUTONOMOUS TRI-STATE RESPONSE ENGINE                           │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Outcome A: FORWARDED     │ Legitimate normal traffic & genuine heavy   │
│                          │ file transfers safely reach destination!    │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Outcome B: BLOCKED       │ Malicious Port Scans on empty ports or DDoS │
│                          │ ➔ Jailed for 90-120s with live countdown    │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Outcome C: QUARANTINED   │ @very suspicious anomalies quarantined with │
│                          │ deep forensic PCAP dump saved for admin     │
└──────────────────────────┴─────────────────────────────────────────────┘
                                   │
                                   ▼
            [ SQLite WAL Lightweight Forensics Database ]
                                   │
                                   ▼
                  [ Real-Time Live SOC Dashboard ]
```

---

## 🎯 Critical Differentiation for Hackathon Judges

### Genuine Heavy Data Transfer vs. Hacker Empty-Port Scan

| Metric | Genuine Heavy Transfer | Hacker Port Scan |
| :--- | :--- | :--- |
| **Target Ports** | **Single Port** (e.g., 443 HTTPS or 8080) | **15+ Empty/Closed Ports** (21, 23, 135, 139, 445, 1433, 3389...) |
| **Packet Size** | Full Ethernet MTU (1460 bytes) | Tiny SYN frames (40-60 bytes) |
| **SentinelEdge Action** | **ALLOWED** (Never disconnected) | **TERMINATED** (90-second Firewall Jail) |

---

## 🎬 Live Hackathon Presentation Script (Pitch Guide)

1. **The Edge Problem**:
   * *"Traditional security appliances like Palo Alto cost tens of thousands of dollars, while open-source stacks like Suricata + Zeek + Elasticsearch require 4-8 GB of RAM and high CPU. Mid-sized colleges and enterprises cannot afford or run them on edge routers."*

2. **The SentinelEdge Solution**:
   * Show the top bar on the live dashboard: **Edge RAM: ~32 MB | CPU: < 3% | Wire Latency: 0.3 ms**.
   * *"SentinelEdge is hyper-lightweight. It runs directly on the router's management tap with sub-millisecond response."*

3. **Demonstrate Zero False Positives (Live Button)**:
   * Click **`[ Simulate Genuine Heavy Data Transfer ]`**.
   * Show that even with massive packet volume, SentinelEdge recognizes it as single-port data sharing and **delivers it safely without disconnecting the user**.

4. **Demonstrate Automated Port Scan Termination (Live Button)**:
   * Click **`[ Simulate Hacker Port Scan (Empty Ports) ]`**.
   * Watch the pipeline light up:
     * Tier 1 flags multi-port velocity.
     * Tier 2 measures empty-port dispersion.
     * Tier 3 Neurons confirm `PORT_SCAN` at 98% confidence.
     * Tier 4 **terminates the attacker IP and places them in the Dynamic Firewall Blocklist with a live 90-second countdown timer!**
     * Show that any subsequent packet from that attacker is instantly dropped at the wire edge.

5. **Show Wireshark Forensic Integration**:
   * In the Live Incident Table, click **`[ Inspect ]`** on an incident.
   * View the raw Hex/ASCII dump.
   * Click **`[ 📥 Export Wireshark .pcap ]`** to show you can load the capture directly into Wireshark for digital forensics!

---

## 📂 Codebase Structure

* `main.py`: Single executable to launch the IDPS engine and dashboard.
* `sentinel_core.py`: Core orchestrator routing packets through all 4 tiers.
* `tier1_wire_filter/`: Suricata & Snort rule parser and fast stateless engine (`sentinel.rules`).
* `tier2_agent/`: Sentinel AI Agent profiling port dispersion, flow entropy, and device baselines.
* `tier3_neurons/`: Multi-layer neural network with trained weights (`weights.json`).
* `tier4_response/`: Autonomous response engine and SQLite WAL incident database (`database.py`).
* `simulation/`: Realistic background traffic generator simulating college subnets, heavy transfers, and port scans.
* `dashboard/`: FastAPI web server and modern dark SOC frontend (`index.html`, `style.css`, `app.js`).
