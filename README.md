# 🛡️ SENTINEL EDGE: Autonomous Lightweight Edge IDPS & Forensics

> **Hackathon Edition**: Mid-Enterprise & Campus Network Edge Defense Engine  
> **Key Innovation**: Dual Suricata/Snort Fast Wire Filter + Sentinel AI Agent + Multi-Layer Neurons (DNN) + Tri-State Autonomous Response.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black.svg?logo=vercel)](https://sentinel-edge-static.vercel.app/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7.svg?logo=render)](https://sentinel-edge.onrender.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌐 Live Deployments

Experience SentinelEdge live in action:

| Service | Link | Description |
| :--- | :--- | :--- |
| **🚀 Production SOC Dashboard** | **[sentinel-edge-static.vercel.app](https://sentinel-edge-static.vercel.app/)** | Hosted on Vercel Edge CDN with interactive 3D Campus map |
| **⚡ Edge Engine & WebSocket API** | **[sentinel-edge.onrender.com](https://sentinel-edge.onrender.com/)** | Hosted on Render (FastAPI + WebSocket + AI Engine) |
| **📦 GitHub Repository** | **[chandrakanthGupta/sentinel-edge](https://github.com/chandrakanthGupta/sentinel-edge)** | Complete source code, Docker configs & documentation |

---

## 📊 System Architecture & Data Flow

### 1. The 4-Tier Inspection & Triage Pipeline

```mermaid
flowchart TD
    A["Incoming Raw Packet Stream"] --> B{"Tier 1: Wire Filter<br>(Snort & Suricata Rules + Stateless Checks)"}
    
    B -->|"Clean Normal Flow<br>(Standard safe ports & payloads)"| F1["Outcome A: INSTANT FORWARD<br>(&lt; 0.1ms Wire Speed)"]
    B -->|"Flagged / Ambiguous Traffic<br>(CVE match, SYN burst, Xmas/NULL)"| C["Tier 2: Sentinel AI Agent<br>(Port Dispersion & Shannon Entropy)"]
    
    C -->|"10-Feature Normalized Vector<br>(PDR, EPR, Flow Rates)"| D["Tier 3: The Neurons<br>(Multi-Layer Deep Neural Network)"]
    
    D -->|"DNN Classification<br>(Confidence &gt; 95%)"| E{"Tier 4: Tri-State Response"}
    
    E -->|"BENIGN / HEAVY_TRANSFER"| F2["Outcome A: FORWARD<br>(Zero false-positive disconnection)"]
    E -->|"PORT_SCAN / DDOS"| F3["Outcome B: BLOCK & JAIL<br>(90-120s Dynamic Firewall Ban)"]
    E -->|"EXPLOIT / ANOMALY"| F4["Outcome C: QUARANTINE<br>(Forensic PCAP Dump saved for admin)"]

    F1 --> G[("SQLite WAL Incident Database")]
    F2 --> G
    F3 --> G
    F4 --> G
    
    G --> H["Real-Time Live SOC Dashboard<br>(WebSocket 0.25s Live Stream)"]
```

---

### 2. Dual Cloud Deployment Architecture (Vercel + Render)

```mermaid
flowchart LR
    subgraph Clients["Browser Clients (Admins & Judges)"]
        Browser["User Browser"]
    end

    subgraph VercelEdge["Vercel Global Edge CDN"]
        VercelUI["SOC Dashboard Frontend<br>• Real-Time Threat Visualizer<br>• Three.js 3D Campus Map<br>• Dynamic Countdown Blocklist"]
    end

    subgraph RenderCloud["Render Cloud Platform"]
        FastAPI["FastAPI App Server<br>(Uvicorn ASGI)"]
        WS["WebSocket Streamer<br>(/ws)"]
        Sim["Traffic & Threat Generator<br>(Background Thread)"]
        Engine["4-Tier AI/DNN IDPS Engine"]
        DB[("SQLite WAL Database<br>Incidents & Blocklist")]
    end

    Browser -->|"1. Loads Web UI & 3D Map"| VercelUI
    Browser <-->|"2. Live Threat Stream (WSS)"| WS
    Browser <-->|"3. REST APIs: Telemetry & Blocklist"| FastAPI
    FastAPI <--> Engine
    Sim -->|"Continuous Packet Feed"| Engine
    Engine -->|"Records Incidents"| DB
    Engine -->|"Broadcasts Events"| WS
```

---

### 3. Critical Differentiator: Genuine Heavy Transfer vs. Hacker Port Scan

```mermaid
flowchart TD
    subgraph TrafficSource["Campus Subnet Ingress"]
        Lab2["Lab 2 Research Machine<br>Transfers 10 GB dataset"]
        Attacker["Attacker Device<br>Automated Reconnaissance Script"]
    end

    Lab2 -->|"Single Port: 443 HTTPS<br>Full MTU: 1460 bytes<br>Low Entropy"| Triage{"Sentinel AI Agent Analysis"}
    Attacker -->|"15+ Empty Ports: 21, 23, 445...<br>Tiny SYN Frames: 40-60 bytes<br>High Entropy"| Triage

    Triage -->|"PDR &le; 0.10, EPR = 0.0<br>Recognized as Single-Port Heavy"| Safe["SAFE: Genuine Heavy Transfer<br>Action: ALLOWED (No Disconnection)"]
    Triage -->|"PDR &gt; 0.60, EPR &gt; 0.80<br>Recognized as Multi-Port Scan"| Jail["THREAT: Hacker Port Scan<br>Action: 90s DYNAMIC FIREWALL JAIL"]
```

| Metric | Genuine Heavy Transfer | Hacker Port Scan |
| :--- | :--- | :--- |
| **Target Ports** | **Single Port** (e.g., 443 HTTPS or 8080) | **15+ Empty/Closed Ports** (21, 23, 135, 139, 445, 1433, 3389...) |
| **Packet Size** | Full Ethernet MTU (1460 bytes) | Tiny SYN frames (40-60 bytes) |
| **Port Diversity Ratio (PDR)** | Extremely low ($\le 0.05$) | Very high ($\ge 0.85$) |
| **Empty-Port Rejection (EPR)** | $0.0$ | Approaching $1.0$ |
| **SentinelEdge Action** | **ALLOWED** (Never disconnected) | **TERMINATED** (90-second Dynamic Firewall Jail) |

---

## 🚀 Quick Start Guide

### Option 1: Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/chandrakanthGupta/sentinel-edge.git
cd sentinel-edge

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch SentinelEdge engine & dashboard
python main.py
```
Open your browser at: 👉 **`http://127.0.0.1:8000`**

### Option 2: Run with Docker Compose

```bash
docker compose up -d --build
```
Open your browser at: 👉 **`http://localhost:8000`**

### Option 3: Deploy to Cloud (Render / Railway)

- **Repository**: `https://github.com/chandrakanthGupta/sentinel-edge`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python main.py`
- **Port**: Auto-detected via `$PORT` environment variable (defaults to `8000`)

---

## 🎬 Live Hackathon Demo Script (Pitch Guide)

1. **The Edge Problem**:
   * *"Traditional security appliances like Palo Alto cost tens of thousands of dollars, while open-source stacks like Suricata + Zeek + Elasticsearch require 4-8 GB of RAM and high CPU. Mid-sized colleges and enterprises cannot afford or run them on edge routers."*

2. **The SentinelEdge Solution**:
   * Show the telemetry bar on the live dashboard: **Edge RAM: ~32 MB | CPU: < 3% | Wire Latency: 0.3 ms**.
   * *"SentinelEdge is hyper-lightweight. It runs directly on the router's management tap with sub-millisecond wire response."*

3. **Demonstrate Zero False Positives**:
   * When genuine heavy transfers stream across the network, SentinelEdge recognizes single-port bulk transfers and **delivers them safely without disconnecting the user**.

4. **Demonstrate Automated Port Scan Termination**:
   * Watch the pipeline light up:
     * **Tier 1** flags multi-port velocity.
     * **Tier 2** measures empty-port dispersion and Shannon entropy.
     * **Tier 3 Neurons** confirm `PORT_SCAN` at 98%+ confidence.
     * **Tier 4** autonomously terminates the attacker IP and places them in the **Dynamic Firewall Blocklist with a live countdown timer**! Any subsequent packet from that IP is dropped instantly at wire edge.

5. **Show Wireshark Forensic Integration**:
   * In the Live Incident Table, click **`[ Inspect ]`** on an incident.
   * View the raw Hex/ASCII payload dump.
   * Click **`[ 📥 Export Wireshark .pcap ]`** to download a synthetic, Wireshark-compatible binary PCAP file for forensic analysis.

---

## 📂 Codebase Structure

```
sentinel-edge/
├── main.py                          # Main launcher for IDPS engine & dashboard server
├── sentinel_core.py                 # Core orchestrator routing packets through Tiers 1-4
├── requirements.txt                 # Python dependencies (FastAPI, uvicorn, numpy, psutil, etc.)
├── Dockerfile                       # Production container definition
├── docker-compose.yml               # Multi-container orchestration config
├── tier1_wire_filter/               # TIER 1: Suricata & Snort rule parser and fast stateless engine
│   ├── engine.py
│   └── sentinel.rules               # Snort/Suricata rules (CVEs, SQLi, Log4j, probes)
├── tier2_agent/                     # TIER 2: Sentinel AI Agent
│   └── agent.py                     # Flow aggregator, port dispersion, Shannon entropy profiler
├── tier3_neurons/                   # TIER 3: The Neurons (DNN)
│   ├── neurons.py                   # Multi-layer neural network classifier
│   └── weights.json                 # Pre-trained deep neural weights
├── tier4_response/                  # TIER 4: Autonomous Response Engine & Forensics
│   ├── response_engine.py           # Tri-state actuator (Forward / Jail / Quarantine)
│   ├── database.py                  # High-performance SQLite WAL database interface
│   └── sentinel_incidents.db        # Checkpointed incident records
├── simulation/                      # Continuous traffic and attack generator
│   └── traffic_generator.py         # Simulates campus subnets, heavy transfers, port scans
├── dashboard/                       # SOC Dashboard web application
│   ├── server.py                    # FastAPI server with WebSocket & REST endpoints
│   └── static/                      # Frontend dark-mode SOC interface
│       ├── index.html               # Main dashboard UI
│       ├── style.css                # Custom cybersecurity HUD styling
│       ├── app.js                   # WebSocket client & real-time telemetry renderer
│       └── campus3d/                # Three.js 3D Campus interactive map
└── poster/                          # Academic presentation materials
    ├── poster.html
    └── POSTER_PRESENTATION.md
```

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
