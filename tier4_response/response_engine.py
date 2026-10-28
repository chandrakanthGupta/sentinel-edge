"""
SentinelEdge - Tier 4: Autonomous Tri-State Response Engine
Executes dynamic firewall actions:
- Immediate drop & 1-2 minute temporary IP ban for Port Scanning & Floods
- Safe wire delivery for Benign & Genuine Heavy Transfers
- Deep Quarantine & Forensic capture for @very suspicious anomalies
"""

import time
from typing import Dict, Any, Tuple
from tier4_response.database import IncidentDatabase

DEFAULT_PORT_SCAN_BAN_SECONDS = 90  # 1.5 minutes cooldown as requested by user
DEFAULT_ATTACK_BAN_SECONDS = 120    # 2 minutes cooldown

class AutonomousResponseEngine:
    def __init__(self, db: IncidentDatabase):
        self.db = db
        # In-memory fast cache for active blocked IPs: ip -> expires_at
        self.blocklist_cache: Dict[str, float] = {}
        # Keep track of genuine heavy transfers passed
        self.genuine_heavy_transfers_count = 0
        self._sync_blocklist_from_db()

    def _sync_blocklist_from_db(self):
        active = self.db.get_active_blocklist()
        now = time.time()
        for item in active:
            if item["expires_at"] > now:
                self.blocklist_cache[item["ip"]] = item["expires_at"]

    def is_ip_blocked(self, ip: str) -> Tuple[bool, int]:
        now = time.time()
        if ip in self.blocklist_cache:
            expires_at = self.blocklist_cache[ip]
            if expires_at > now:
                return True, int(expires_at - now)
            else:
                # Expired: remove from active blocklist
                del self.blocklist_cache[ip]
                self.db.remove_from_blocklist(ip)
        return False, 0

    def decide_and_act(self,
                       packet: Dict[str, Any],
                       tier1_result: Dict[str, Any],
                       agent_result: Dict[str, Any],
                       neuron_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the autonomous Tri-State decision:
        Outcome A: FORWARDED (Clean normal or genuine heavy transfer)
        Outcome B: BLOCKED (Port scan on empty ports, DDoS, exploit payload -> 1-2 min ban)
        Outcome C: QUARANTINED (@very suspicious anomaly -> forensic log saved)
        """
        t_start = time.perf_counter()
        src_ip = packet.get("src_ip", "0.0.0.0")
        dst_ip = packet.get("dst_ip", "0.0.0.0")
        dst_port = packet.get("dst_port", 0)
        subnet = packet.get("subnet", "Lab-1")

        # 1. Fast Wire Check: Is source IP already jailed in dynamic blocklist?
        is_blocked, remaining = self.is_ip_blocked(src_ip)
        if is_blocked:
            lat = (time.perf_counter() - t_start) * 1e6
            return {
                "action": "BLOCKED",
                "reason": f"Active Firewall Ban ({remaining}s remaining)",
                "ban_duration": remaining,
                "is_active_ban": True,
                "latency_us": round(lat, 2)
            }

        neuron_class = neuron_result.get("neuron_class", "BENIGN_NORMAL")
        confidence = neuron_result.get("neuron_confidence", 0.0)
        agent_context = agent_result.get("agent_context", "EVALUATE_NEURONS")

        action = "FORWARDED"
        ban_seconds = 0
        reason = "Clean packet forwarded to destination"

        # 2. Evaluate Genuine Heavy Data Transfer vs Attacks
        if neuron_class == "BENIGN_HEAVY_TRANSFER" or (agent_result.get("is_single_port_heavy") and neuron_class != "MALICIOUS_PAYLOAD"):
            # Genuine file transfer / streaming on single port: MUST NOT BE BLOCKED!
            action = "FORWARDED"
            reason = "Genuine Heavy Data Transfer Cleared (Single-Port Legitimate Stream)"
            self.genuine_heavy_transfers_count += 1

        elif neuron_class == "BENIGN_NORMAL":
            action = "FORWARDED"
            reason = "Normal packet forwarded to destination point"

        elif neuron_class == "PORT_SCAN" or agent_result.get("is_port_scan_pattern"):
            # Malicious Port Scan detected targeting empty ports:
            # Enforce 90-second (1.5 min) temporary IP ban
            action = "BLOCKED"
            ban_seconds = DEFAULT_PORT_SCAN_BAN_SECONDS
            reason = f"Port Scan on Empty Ports Detected -> Jailed for {ban_seconds}s"
            self.blocklist_cache[src_ip] = time.time() + ban_seconds
            self.db.add_to_blocklist(src_ip, reason, ban_seconds)

        elif neuron_class in ("DOS_SYN_FLOOD", "MALICIOUS_PAYLOAD") and confidence >= 65.0:
            # Active attack: Enforce 120-second (2 min) temporary IP ban
            action = "BLOCKED"
            ban_seconds = DEFAULT_ATTACK_BAN_SECONDS
            reason = f"Active Attack ({neuron_class}) -> Jailed for {ban_seconds}s"
            self.blocklist_cache[src_ip] = time.time() + ban_seconds
            self.db.add_to_blocklist(src_ip, reason, ban_seconds)

        elif confidence < 65.0 and agent_result.get("agent_anomaly_score", 0.0) >= 0.50:
            # Ambiguous / novel suspicious traffic: QUARANTINE & FORENSIC LOG
            action = "QUARANTINED"
            reason = "@very suspicious: Anomaly quarantined for deep forensic investigation"

        else:
            action = "FORWARDED"
            reason = "Normal packet forwarded to destination point"

        # Record incident in database if it was an action other than ordinary benign pass
        if action in ("BLOCKED", "QUARANTINED") or neuron_class != "BENIGN_NORMAL":
            raw_payload = packet.get("payload", "")
            payload_hex = raw_payload.encode("utf-8", errors="ignore").hex() if isinstance(raw_payload, str) else ""
            
            summary = f"{packet.get('protocol', 'TCP')} {src_ip}:{packet.get('src_port', 0)} -> {dst_ip}:{dst_port} | {reason}"
            incident_data = {
                "src_ip": src_ip,
                "dst_ip": dst_ip,
                "src_port": packet.get("src_port", 0),
                "dst_port": dst_port,
                "protocol": packet.get("protocol", "TCP"),
                "subnet": subnet,
                "tier1_rule_hit": tier1_result.get("msg", "None") if tier1_result.get("status") == "FLAGGED" else "Clean",
                "agent_anomaly_score": agent_result.get("agent_anomaly_score", 0.0),
                "port_diversity_ratio": agent_result.get("features", {}).get("port_diversity_ratio", 0.0),
                "neuron_class": neuron_class,
                "neuron_confidence": confidence,
                "action_taken": action,
                "ban_duration_seconds": ban_seconds,
                "payload_hex": payload_hex,
                "packet_summary": summary
            }
            self.db.record_incident(incident_data)

        lat = (time.perf_counter() - t_start) * 1e6
        return {
            "action": action,
            "reason": reason,
            "ban_duration": ban_seconds,
            "is_active_ban": False,
            "latency_us": round(lat, 2)
        }
