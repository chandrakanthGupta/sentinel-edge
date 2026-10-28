"""
SentinelEdge - Tier 4: SQLite WAL Incident & Forensics Database
Ultra-fast, zero-server, embeddable database with Write-Ahead-Logging (WAL)
for microsecond inserts and concurrent non-blocking reads by the Dashboard.
"""

import os
import sqlite3
import time
from typing import Dict, Any, List, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "sentinel_incidents.db")

class IncidentDatabase:
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        # Enable WAL mode for high concurrency
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                datetime_str TEXT NOT NULL,
                src_ip TEXT NOT NULL,
                dst_ip TEXT NOT NULL,
                src_port INTEGER,
                dst_port INTEGER,
                protocol TEXT,
                subnet TEXT,
                tier1_rule_hit TEXT,
                agent_anomaly_score REAL,
                port_diversity_ratio REAL,
                neuron_class TEXT NOT NULL,
                neuron_confidence REAL NOT NULL,
                action_taken TEXT NOT NULL,
                ban_duration_seconds INTEGER,
                payload_hex TEXT,
                packet_summary TEXT
            );

            CREATE TABLE IF NOT EXISTS active_blocklist (
                ip TEXT PRIMARY KEY,
                reason TEXT NOT NULL,
                banned_at REAL NOT NULL,
                expires_at REAL NOT NULL,
                status TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp);
            CREATE INDEX IF NOT EXISTS idx_incidents_src_ip ON incidents(src_ip);
            """)

    def record_incident(self, incident: Dict[str, Any]) -> int:
        now = time.time()
        dt_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now))
        with self._get_connection() as conn:
            cur = conn.execute("""
            INSERT INTO incidents (
                timestamp, datetime_str, src_ip, dst_ip, src_port, dst_port,
                protocol, subnet, tier1_rule_hit, agent_anomaly_score,
                port_diversity_ratio, neuron_class, neuron_confidence,
                action_taken, ban_duration_seconds, payload_hex, packet_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now,
                dt_str,
                incident.get("src_ip", "0.0.0.0"),
                incident.get("dst_ip", "0.0.0.0"),
                incident.get("src_port", 0),
                incident.get("dst_port", 0),
                incident.get("protocol", "TCP"),
                incident.get("subnet", "Unknown"),
                incident.get("tier1_rule_hit", "None"),
                incident.get("agent_anomaly_score", 0.0),
                incident.get("port_diversity_ratio", 0.0),
                incident.get("neuron_class", "UNKNOWN"),
                incident.get("neuron_confidence", 0.0),
                incident.get("action_taken", "LOGGED"),
                incident.get("ban_duration_seconds", 0),
                incident.get("payload_hex", ""),
                incident.get("packet_summary", "")
            ))
            return cur.lastrowid

    def add_to_blocklist(self, ip: str, reason: str, duration_seconds: int = 90):
        now = time.time()
        expires_at = now + duration_seconds
        with self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO active_blocklist (ip, reason, banned_at, expires_at, status)
            VALUES (?, ?, ?, ?, 'ACTIVE')
            """, (ip, reason, now, expires_at))

    def remove_from_blocklist(self, ip: str):
        with self._get_connection() as conn:
            conn.execute("DELETE FROM active_blocklist WHERE ip = ?", (ip,))

    def get_active_blocklist(self) -> List[Dict[str, Any]]:
        now = time.time()
        with self._get_connection() as conn:
            rows = conn.execute("""
            SELECT ip, reason, banned_at, expires_at, status
            FROM active_blocklist
            WHERE expires_at > ?
            ORDER BY expires_at DESC
            """, (now,)).fetchall()
            
            result = []
            for r in rows:
                remaining = max(0, int(r["expires_at"] - now))
                result.append({
                    "ip": r["ip"],
                    "reason": r["reason"],
                    "banned_at": r["banned_at"],
                    "expires_at": r["expires_at"],
                    "remaining_seconds": remaining,
                    "status": r["status"]
                })
            return result

    def get_recent_incidents(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute("""
            SELECT * FROM incidents
            ORDER BY id DESC
            LIMIT ?
            """, (limit,)).fetchall()
            return [dict(r) for r in rows]

    def get_incident_by_id(self, incident_id: int) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
            return dict(row) if row else None

    def get_counts(self) -> Dict[str, int]:
        with self._get_connection() as conn:
            total = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
            blocked = conn.execute("SELECT COUNT(*) FROM incidents WHERE action_taken = 'BLOCKED'").fetchone()[0]
            quarantined = conn.execute("SELECT COUNT(*) FROM incidents WHERE action_taken = 'QUARANTINED'").fetchone()[0]
            return {
                "total_incidents": total,
                "blocked": blocked,
                "quarantined": quarantined
            }
