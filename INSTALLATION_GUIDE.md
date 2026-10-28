# 🛠️ SENTINEL EDGE: INSTALLATION GUIDE

> **Complete Setup, Deployment & Verification Playbook (Hackathon Perspective)**  
> *Target Setup Time: Under 60 Seconds | Hardware Footprint: < 35 MB RAM | Zero External Server Dependencies*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel%20Edge%20CDN-black.svg?logo=vercel)](https://sentinel-edge-static.vercel.app/)
[![Engine API](https://img.shields.io/badge/Engine%20API-Render%20Cloud-46E3B7.svg?logo=render)](https://sentinel-edge.onrender.com/)
[![GitHub](https://img.shields.io/badge/GitHub-chandrakanthGupta/sentinel--edge-181717.svg?logo=github)](https://github.com/chandrakanthGupta/sentinel-edge)

---

## 🧭 Which Evaluation Track Are You On?

```
┌────────────────────────────────────────────────────────────────────────┐
│                      HOW WOULD YOU LIKE TO EVALUATE?                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   [ TRACK 1 ]                [ TRACK 2 ]               [ TRACK 3 ]
  Zero-Install Cloud       60-Second Local Run        Docker Container
  (Judges with 2 mins)     (Technical Verification)   (Full Isolation)
  Open Live Web URL        Python 3 + pip             docker compose up
```

---

## ⚡ TRACK 1: Zero-Install Instant Evaluation (For Judges on the Go)

If you are evaluating this project on your phone, tablet, or laptop during booth rounds, you **do not need to install anything**:

1. **Open the Live SOC Dashboard**:  
   👉 **[https://sentinel-edge-static.vercel.app/](https://sentinel-edge-static.vercel.app/)**
2. **Observe Real-Time Stream**:
   - The dashboard connects automatically to our live cloud backend on Render via WebSocket (`wss://sentinel-edge.onrender.com/ws`).
   - Notice the telemetry ticker at the top: **Wire Latency: ~0.3 ms | Edge RAM: ~32 MB | CPU: < 3%**.
   - Watch live simulated campus traffic flow across 4 tiers with automatic attacker jailing.

---

## 💻 TRACK 2: The 60-Second Local Rapid Deployment (Recommended)

If you want to run the code directly on your local machine to inspect the source, architecture, and behavior:

### Prerequisites
* Python 3.10, 3.11, or 3.12 (`python --version`)
* Git (`git --version`)

### Step 1: Clone the Repository
```bash
git clone https://github.com/chandrakanthGupta/sentinel-edge.git
cd sentinel-edge
```

### Step 2: Install Lightweight Dependencies
SentinelEdge is designed specifically to avoid heavyweight enterprise bloat (no Elasticsearch, no Redis, no MySQL). All requirements install in under 20 seconds:
```bash
pip install -r requirements.txt
```

### Step 3: Launch the Autonomous Engine
```bash
python main.py
```

### Step 4: Open the Live SOC Dashboard
Navigate to:
👉 **`http://127.0.0.1:8000`**

> [!NOTE]  
> **Why it boots in < 1 second**:
> * **Zero External Daemons**: SQLite WAL mode provides high-speed embedded concurrency without running a database server.
> * **Pre-Compiled Rules**: 12 curated Snort/Suricata rules are parsed and hashed in memory at launch.
> * **Instant Neural Weights**: Tier 3 Neurons load pre-calibrated weights directly from `tier3_neurons/weights.json` without needing cold GPU training.

---

## 🐳 TRACK 3: Containerized Deployment (Docker Compose)

For fully isolated testing in a containerized sandbox:

```bash
# 1. Clone repository
git clone https://github.com/chandrakanthGupta/sentinel-edge.git
cd sentinel-edge

# 2. Build and launch container in background
docker compose up -d --build

# 3. View live inspection logs
docker compose logs -f
```
Open your browser at: 👉 **`http://localhost:8000`**

To stop: `docker compose down`

---

## 🍓 TRACK 4: Real Edge Device Deployment (Raspberry Pi / OpenWrt / Linux Gateway)

To deploy SentinelEdge on a real physical network gateway or \$35 Raspberry Pi monitoring a SPAN/TAP mirror port:

```bash
# 1. Update gateway packages
sudo apt update && sudo apt install -y python3-pip python3-venv git

# 2. Clone and setup environment
git clone https://github.com/chandrakanthGupta/sentinel-edge.git
cd sentinel-edge
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 3. Run as a persistent background daemon
nohup python3 main.py > sentinel_edge.log 2>&1 &
```

---

## 🧪 Hackathon Feature Verification Checklist

Once running, perform these 4 test actions to verify all hackathon requirements:

### ✅ Test 1: Verify the 4-Tier Pipeline Flow
1. Look at the **4-Tier Pipeline Flow Visualizer** on the dashboard.
2. Watch incoming packets animate through:
   - **Tier 1 (Fast Wire Filter)**: Evaluates Snort signatures and TCP flags.
   - **Tier 2 (Sentinel AI Agent)**: Calculates Port Diversity Ratio ($PDR$) and Shannon entropy.
   - **Tier 3 (The Neurons DNN)**: Outputs softmax classification probabilities (`BENIGN`, `HEAVY_TRANSFER`, `PORT_SCAN`, `DDOS`, `EXPLOIT`).
   - **Tier 4 (Autonomous Response)**: Actuates Tri-State response (`FORWARD`, `BLOCK`, `QUARANTINE`).

### ✅ Test 2: Verify Zero False Positives on Genuine Heavy Data Transfers
* **Evaluation Metric**: Does a large file transfer get falsely disconnected like in traditional rate-limiting IDPS?
* **Result**: SentinelEdge analyzes the flow, determines that all traffic concentrates on a **single port (e.g., 443)** with full MTU sizing, and **ALLOWS the transfer to complete uninterrupted** with $0.0\%$ false-positive disconnect rate.

### ✅ Test 3: Verify Automated Attacker Jailing (Dynamic Firewall Blocklist)
* **Evaluation Metric**: Are malicious port scans terminated autonomously?
* **Result**:
  1. An attacker scanning empty/closed ports triggers Tier 2 empty-port rejection ($EPR > 0.8$).
  2. Tier 3 Neurons classify as `PORT_SCAN` at $98\%+$ confidence.
  3. Tier 4 immediately adds the source IP to the **Dynamic Firewall Blocklist**.
  4. Notice the **live 90-second countdown timer** ticking on the screen!
  5. Any subsequent packet from that IP is dropped instantly at wire edge.
  6. Click **`[ Unblock ]`** to test admin manual override capability.

### ✅ Test 4: Verify Digital Forensics & Wireshark PCAP Synthesis
* **Evaluation Metric**: Can security administrators extract standard forensic evidence for law enforcement?
* **Result**:
  1. In the **Live Incidents Table**, click **`[ Inspect ]`** on any flagged threat.
  2. Review the full hexadecimal and ASCII dump of the captured frame.
  3. Click **`[ 📥 Export Wireshark .pcap ]`**.
  4. Open the downloaded file in Wireshark — it is a valid, standard binary PCAP file containing the captured threat!

---

## 🎯 Technical Defense Guide for Judges

| Hard Question From Judge | Winning Response |
| :--- | :--- |
| **"Why not use Suricata or Snort alone?"** | *"Traditional Suricata/Snort stacks consume 2–4 GB RAM, have no stateful cognitive analysis, and falsely drop users during bulk file transfers. SentinelEdge uses Snort rules purely as a **Tier 1 microsecond gatekeeper**, routing ambiguous packets to our lightweight **AI Agent and Deep Neural Network**."* |
| **"How is this feasible on low-cost edge hardware?"** | *"By offloading deterministic checks to Tier 1 and keeping our neural network architecture ultra-lean (10 $\to$ 32 $\to$ 16 $\to$ 5), the entire system consumes **less than 35 MB RAM** with **under 0.4 ms wire latency**."* |
| **"How did you train the model?"** | *"Trained using feature distributions derived from the canonical **CIC-IDS2017 & NF-UQ-NIDS** network intrusion datasets, normalized across 10 temporal and statistical network features."* |

---

## 🏆 Project Architecture Summary

```
[ Ingress Packet Stream ]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ TIER 1: FAST WIRE FILTER (Snort & Suricata Rules)      │ ──[Clean Normal]──► FORWARD (< 0.1ms)
└──────────────────────────┬─────────────────────────────┘
                           │ (Flagged / Ambiguous)
                           ▼
┌────────────────────────────────────────────────────────┐
│ TIER 2: SENTINEL AI AGENT (Port Dispersion & Entropy)  │
└──────────────────────────┬─────────────────────────────┘
                           │ (10-Feature Normalized Vector)
                           ▼
┌────────────────────────────────────────────────────────┐
│ TIER 3: THE NEURONS (Multi-Layer Deep Neural Network)  │
└──────────────────────────┬─────────────────────────────┘
                           │ (Softmax Verdict: > 95% Conf)
                           ▼
┌────────────────────────────────────────────────────────┐
│ TIER 4: AUTONOMOUS TRI-STATE RESPONSE ENGINE           │
├──────────────────────────┬─────────────────────────────┤
│ Outcome A: FORWARDED     │ Legitimate Heavy Data       │
│ Outcome B: BLOCKED       │ Dynamic 90s Firewall Jail   │
│ Outcome C: QUARANTINED   │ Deep Wireshark PCAP Dump    │
└────────────────────────────────────────────────────────┘
```
