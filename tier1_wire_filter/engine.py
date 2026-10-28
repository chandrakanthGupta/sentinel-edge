"""
SentinelEdge - Tier 1: Suricata & Snort Fast-Path Wire Filter
Performs wire-speed signature matching, protocol anomaly checking,
and stateless threshold filtering on edge packets.
"""

import os
import re
import time
from collections import defaultdict
from typing import Dict, Any, List, Optional, Tuple

class Rule:
    def __init__(self, action: str, proto: str, src_ip: str, src_port: str,
                 direction: str, dst_ip: str, dst_port: str, options: Dict[str, str], raw: str):
        self.action = action
        self.proto = proto.upper()
        self.src_ip = src_ip
        self.src_port = src_port
        self.dst_ip = dst_ip
        self.dst_port = dst_port
        self.options = options
        self.raw = raw
        self.sid = int(options.get("sid", "0"))
        self.msg = options.get("msg", "Unknown Rule")
        self.content = options.get("content", None)
        self.nocase = "nocase" in options
        self.flags = options.get("flags", None)

class Tier1WireFilter:
    def __init__(self, rules_path: Optional[str] = None):
        self.rules: List[Rule] = []
        # Threshold trackers: key -> list of timestamps
        self.src_packet_tracker: Dict[str, List[float]] = defaultdict(list)
        self.src_syn_tracker: Dict[str, List[float]] = defaultdict(list)
        self.src_ports_tracker: Dict[str, List[Tuple[float, int]]] = defaultdict(list)
        
        if rules_path and os.path.exists(rules_path):
            self.load_rules(rules_path)
        else:
            default_path = os.path.join(os.path.dirname(__file__), "sentinel.rules")
            if os.path.exists(default_path):
                self.load_rules(default_path)

    def load_rules(self, filepath: str):
        self.rules.clear()
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                rule = self._parse_rule_line(line)
                if rule:
                    self.rules.append(rule)
        print(f"[Tier 1] Loaded {len(self.rules)} Snort/Suricata rules into Fast-Path Engine.")

    def _parse_rule_line(self, line: str) -> Optional[Rule]:
        # Example: alert tcp any any -> any 80 (msg:"SQLi"; content:"UNION"; sid:1001;)
        pattern = r'^(alert|drop|pass)\s+(\w+)\s+(\S+)\s+(\S+)\s+(->|<>)\s+(\S+)\s+(\S+)\s*\((.*)\);?$'
        m = re.match(pattern, line)
        if not m:
            return None
        action, proto, src_ip, src_port, direction, dst_ip, dst_port, opt_str = m.groups()
        
        # Parse options
        options = {}
        for token in re.finditer(r'([a-zA-Z0-9_-]+)(?::"([^"]*)"|:([^;]+))?;', opt_str):
            key = token.group(1)
            val = token.group(2) if token.group(2) is not None else token.group(3)
            options[key] = val.strip() if val else True

        return Rule(action, proto, src_ip, src_port, direction, dst_ip, dst_port, options, line)

    def inspect_packet(self, packet: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fast-Path inspection.
        Returns result dict:
          - status: 'CLEAN' or 'FLAGGED'
          - rule_hit: Optional Rule details
          - flag_reason: Reason description
          - latency_us: Microseconds spent in Tier 1
        """
        t_start = time.perf_counter()
        now = time.time()
        src_ip = packet.get("src_ip", "0.0.0.0")
        dst_ip = packet.get("dst_ip", "0.0.0.0")
        dst_port = packet.get("dst_port", 0)
        proto = packet.get("protocol", "TCP").upper()
        flags = packet.get("flags", "")
        payload = packet.get("payload", "")

        # 1. Check stateless abnormal flags (Nmap scans)
        if proto == "TCP":
            # NULL scan (flags is empty or 0)
            if flags in ("", "0", 0):
                lat = (time.perf_counter() - t_start) * 1e6
                return {
                    "status": "FLAGGED",
                    "sid": 1000002,
                    "msg": "SCAN Nmap NULL Scan (Stealth Probe)",
                    "category": "PortScan",
                    "latency_us": round(lat, 2)
                }
            # Xmas scan (FIN + PSH + URG)
            if all(f in flags for f in ("F", "P", "U")):
                lat = (time.perf_counter() - t_start) * 1e6
                return {
                    "status": "FLAGGED",
                    "sid": 1000003,
                    "msg": "SCAN Nmap Xmas Scan (FIN+PSH+URG)",
                    "category": "PortScan",
                    "latency_us": round(lat, 2)
                }

        # 2. Track empty / unopened port probe history per source IP (rolling 3s window)
        # Legitimate traffic to standard campus web/DNS ports (80, 443, 53, 8080) is not an empty port scan!
        STANDARD_WEB_SERVICES = {80, 443, 53, 8080, 22}
        is_empty_unopened_port = dst_port not in STANDARD_WEB_SERVICES

        if is_empty_unopened_port:
            ports_list = self.src_ports_tracker[src_ip]
            ports_list.append((now, dst_port))
            # prune older than 3 seconds
            self.src_ports_tracker[src_ip] = [(t, p) for t, p in ports_list if now - t <= 3.0]
            recent_unique_empty_ports = len(set(p for t, p in self.src_ports_tracker[src_ip]))

            # If a single IP targets >= 5 distinct EMPTY/CLOSED ports in 3s -> Flagged as port scan reconnaissance
            if recent_unique_empty_ports >= 5:
                lat = (time.perf_counter() - t_start) * 1e6
                return {
                    "status": "FLAGGED",
                    "sid": 1000004,
                    "msg": f"SCAN Rapid Multi-Port Probe ({recent_unique_empty_ports} empty target ports in 3s)",
                    "category": "PortScan",
                    "latency_us": round(lat, 2)
                }

        # 3. Check SYN rate threshold
        if proto == "TCP" and "S" in flags and "A" not in flags:
            syns = self.src_syn_tracker[src_ip]
            syns.append(now)
            self.src_syn_tracker[src_ip] = [t for t in syns if now - t <= 2.0]
            if len(self.src_syn_tracker[src_ip]) >= 35:
                lat = (time.perf_counter() - t_start) * 1e6
                return {
                    "status": "FLAGGED",
                    "sid": 1000020,
                    "msg": f"DOS High Volume SYN Flood Burst ({len(self.src_syn_tracker[src_ip])} SYNs/2s)",
                    "category": "DDoS",
                    "latency_us": round(lat, 2)
                }

        # 4. Check Snort / Suricata signature payload patterns
        if payload:
            for rule in self.rules:
                if rule.content:
                    match_str = rule.content
                    if rule.nocase:
                        if match_str.lower() in payload.lower():
                            lat = (time.perf_counter() - t_start) * 1e6
                            return {
                                "status": "FLAGGED",
                                "sid": rule.sid,
                                "msg": rule.msg,
                                "category": "Exploit",
                                "latency_us": round(lat, 2)
                            }
                    else:
                        if match_str in payload:
                            lat = (time.perf_counter() - t_start) * 1e6
                            return {
                                "status": "FLAGGED",
                                "sid": rule.sid,
                                "msg": rule.msg,
                                "category": "Exploit",
                                "latency_us": round(lat, 2)
                            }

        # 5. Clean packet: passes wire filter
        lat = (time.perf_counter() - t_start) * 1e6
        return {
            "status": "CLEAN",
            "sid": None,
            "msg": "Wire Filter Cleared",
            "category": "Benign",
            "latency_us": round(lat, 2)
        }
