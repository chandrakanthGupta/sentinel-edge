"""
SentinelEdge - Tier 2: Sentinel AI Agent
Aggregates network flows, profiles port dispersion & entropy,
distinguishes genuine heavy transfers from empty-port scans,
and prepares normalized feature vectors for Tier 3 (Neurons).
"""

import math
import time
from collections import defaultdict
from typing import Dict, Any, List, Tuple

# Well-known active service ports in campus network
ACTIVE_CAMPUS_SERVICES = {80, 443, 8080, 53, 22, 445}

class FlowStats:
    def __init__(self, src_ip: str, dst_ip: str):
        self.src_ip = src_ip
        self.dst_ip = dst_ip
        self.start_time = time.time()
        self.last_time = time.time()
        self.packet_count = 0
        self.byte_count = 0
        self.targeted_ports: Dict[int, int] = defaultdict(int)
        self.syn_count = 0
        self.ack_count = 0
        self.rst_count = 0
        self.packet_lengths: List[int] = []
        self.inter_arrival_times: List[float] = []

    def update(self, packet: Dict[str, Any]):
        now = time.time()
        dt = max(0.0001, now - self.last_time)
        self.inter_arrival_times.append(dt)
        self.last_time = now
        
        self.packet_count += 1
        pkt_len = packet.get("packet_len", 64)
        self.packet_lengths.append(pkt_len)
        self.byte_count += pkt_len
        
        dst_port = packet.get("dst_port", 0)
        self.targeted_ports[dst_port] += 1
        
        flags = packet.get("flags", "")
        if "S" in flags: self.syn_count += 1
        if "A" in flags: self.ack_count += 1
        if "R" in flags: self.rst_count += 1

    def compute_features(self) -> Dict[str, float]:
        duration = max(0.001, self.last_time - self.start_time)
        unique_ports = len(self.targeted_ports)
        port_diversity_ratio = unique_ports / max(1, self.packet_count)
        
        # Check how many probed ports are NOT active campus services (empty/unopened ports)
        empty_port_probes = sum(count for port, count in self.targeted_ports.items() if port not in ACTIVE_CAMPUS_SERVICES)
        empty_port_ratio = empty_port_probes / max(1, self.packet_count)
        
        # Entropy of targeted ports
        entropy = 0.0
        if unique_ports > 1:
            for p, count in self.targeted_ports.items():
                p_prob = count / self.packet_count
                entropy -= p_prob * math.log2(p_prob)
                
        mean_pkt_len = sum(self.packet_lengths) / max(1, len(self.packet_lengths))
        pkt_rate = self.packet_count / duration
        byte_rate = (self.byte_count / 1024.0) / duration

        return {
            "flow_duration_s": round(duration, 3),
            "total_packets": self.packet_count,
            "total_bytes": self.byte_count,
            "unique_dst_ports": unique_ports,
            "port_diversity_ratio": round(port_diversity_ratio, 4),
            "empty_port_ratio": round(empty_port_ratio, 4),
            "port_entropy": round(entropy, 3),
            "mean_pkt_len": round(mean_pkt_len, 2),
            "pkt_rate_pps": round(pkt_rate, 2),
            "byte_rate_kbps": round(byte_rate, 2),
            "syn_count": self.syn_count,
            "ack_count": self.ack_count,
            "syn_ack_ratio": round(self.syn_count / max(1, self.ack_count), 2)
        }

class SentinelAIAgent:
    def __init__(self):
        # Maps (src_ip, dst_ip) -> FlowStats
        self.flow_table: Dict[Tuple[str, str], FlowStats] = {}
        # Keep track of active hosts in network for contextual baseline
        self.device_baseline: Dict[str, Dict[str, Any]] = {}

    def process(self, packet: Dict[str, Any], tier1_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Receives packet + Tier 1 rule feedback.
        Maintains flow history, computes port dispersion & anomaly metrics,
        and generates the 12-dimensional vector for Tier 3 Neurons.
        """
        t_start = time.perf_counter()
        src_ip = packet.get("src_ip", "0.0.0.0")
        dst_ip = packet.get("dst_ip", "0.0.0.0")
        flow_key = (src_ip, dst_ip)

        if flow_key not in self.flow_table:
            self.flow_table[flow_key] = FlowStats(src_ip, dst_ip)

        flow = self.flow_table[flow_key]
        flow.update(packet)
        features = flow.compute_features()

        # Contextual analysis by the AI Agent:
        # Crucial Hackathon Rule: Differentiate Genuine Heavy Transfer vs Port Scan
        # 1. Genuine Heavy Transfer:
        #    - Concentrated on standard ports (443, 80, 8080), 0 empty ports probed
        #    - Or high byte/packet rate on a single destination port
        # 2. Port Scan Attack:
        #    - Multiple unique empty ports (unique_dst_ports >= 4)
        #    - High empty_port_ratio (> 0.5)
        #    - Low mean packet length (typically 40-60 byte SYN probes)
        #    - High SYN-to-ACK ratio

        payload_str = str(packet.get("payload", ""))
        has_exploit_signature = (
            tier1_result.get("status") == "FLAGGED" and tier1_result.get("category") == "Exploit"
        ) or any(kw in payload_str for kw in ("UNION", "SELECT", "jndi", "/bin/sh", "/etc/passwd"))

        is_single_port_heavy = (
            not has_exploit_signature and
            features["empty_port_ratio"] <= 0.05 and
            features["unique_dst_ports"] <= 2 and
            (features["mean_pkt_len"] >= 200 or packet.get("packet_len", 0) >= 200 or features["total_packets"] >= 5)
        )
        
        is_port_scan_pattern = (
            features["unique_dst_ports"] >= 4 and 
            features["empty_port_ratio"] >= 0.5 and 
            features["port_diversity_ratio"] > 0.2
        )

        # Compute initial Agent Anomaly Score (0.0 to 1.0)
        anomaly_score = 0.05
        if tier1_result.get("status") == "FLAGGED":
            anomaly_score += 0.40
        if is_port_scan_pattern:
            anomaly_score += 0.45
        elif is_single_port_heavy:
            # Downgrade anomaly for genuine file sharing / video streams
            anomaly_score = max(0.02, anomaly_score - 0.30)

        # Factor in payload flags
        if "UNION" in str(packet.get("payload", "")) or "SELECT" in str(packet.get("payload", "")):
            anomaly_score += 0.45
        if "jndi" in str(packet.get("payload", "")):
            anomaly_score += 0.50

        anomaly_score = min(0.99, max(0.01, anomaly_score))
        lat = (time.perf_counter() - t_start) * 1e6

        return {
            "agent_anomaly_score": round(anomaly_score, 3),
            "features": features,
            "is_single_port_heavy": is_single_port_heavy,
            "is_port_scan_pattern": is_port_scan_pattern,
            "agent_context": "GENUINE_HEAVY_TRANSFER" if is_single_port_heavy else (
                "PORT_SCAN_RECONNAISSANCE" if is_port_scan_pattern else "EVALUATE_NEURONS"
            ),
            "latency_us": round(lat, 2)
        }
