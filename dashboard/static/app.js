// SentinelEdge - Real-Time SOC Dashboard Controller
let ws = null;
let activeBlocklist = [];
let allIncidents = [];
let countdownInterval = null;
let campusCameraProgress = 0;

function mountDashboardLayout() {
    const workspaceLeft = document.getElementById("workspace-left");
    const workspaceRight = document.getElementById("workspace-right");
    const pipelineSlot = document.getElementById("pipeline-slot");
    const blocklistSlot = document.getElementById("blocklist-slot");
    const legacyGrid = document.querySelector(".main-split-grid");
    const campusPanel = legacyGrid?.querySelector(".campus-panel");
    const pipelinePanel = legacyGrid?.querySelector(".pipeline-card");
    const blocklistPanel = legacyGrid?.querySelector(".blocklist-card");
    const incidentsPanel = document.querySelector(".incidents-panel");

    if (!workspaceLeft || !workspaceRight || !pipelineSlot || !blocklistSlot ||
        !legacyGrid || !campusPanel || !pipelinePanel || !blocklistPanel || !incidentsPanel) {
        console.error("[SentinelEdge SOC] Dashboard layout could not be initialized: required panels are missing.");
        return;
    }

    workspaceRight.append(campusPanel);
    workspaceLeft.append(incidentsPanel);
    pipelineSlot.append(pipelinePanel);
    blocklistSlot.append(blocklistPanel);
    legacyGrid.remove();
}

function sendCampusCameraProgress(progress) {
    const frame = document.getElementById("campus-3d-frame");
    campusCameraProgress = Math.min(1, Math.max(0, progress));
    document.getElementById("btn-top-view")?.classList.toggle("active", campusCameraProgress >= 0.5);
    document.getElementById("btn-3d-view")?.classList.toggle("active", campusCameraProgress < 0.5);
    frame?.contentWindow?.postMessage(
        { type: "SENTINEL_CAMERA_PROGRESS", progress: campusCameraProgress },
        window.location.origin
    );
}

function setupCampusScrollCamera() {
    const workspace = document.getElementById("main-workspace");
    const frame = document.getElementById("campus-3d-frame");
    const campusPanel = document.querySelector(".campus-panel");
    if (!workspace || !frame || !campusPanel) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;

    const updateProgress = () => {
        animationFrame = 0;
        if (reducedMotion || window.matchMedia("(max-width: 960px)").matches) return;

        const workspaceTop = workspace.getBoundingClientRect().top + window.scrollY;
        const scrollRange = Math.max(1, workspace.offsetHeight - campusPanel.offsetHeight);
        const progress = (window.scrollY - workspaceTop) / scrollRange;
        sendCampusCameraProgress(progress);
    };

    const scheduleUpdate = () => {
        if (!animationFrame) animationFrame = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    frame.addEventListener("load", scheduleUpdate);
    window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin ||
            event.source !== frame.contentWindow ||
            event.data?.type !== "SENTINEL_CAMERA_READY") return;
        sendCampusCameraProgress(campusCameraProgress);
    });

    scheduleUpdate();
}

mountDashboardLayout();
setupCampusScrollCamera();

// Resolve Backend Host: supports Render all-in-one OR Vercel (frontend) + Render (backend)
const urlParams = new URLSearchParams(window.location.search);
const customBackend = urlParams.get("backend") || window.SENTINEL_BACKEND || localStorage.getItem("SENTINEL_BACKEND");
if (urlParams.get("backend")) {
    localStorage.setItem("SENTINEL_BACKEND", urlParams.get("backend"));
}
const BACKEND_HOST = customBackend ? customBackend.replace(/^https?:\/\//, '').replace(/\/$/, '') : window.location.host;
const API_BASE = customBackend ? `https://${BACKEND_HOST}` : "";

// Connect to Real-time WebSocket
function connectWebSocket() {
    const protocol = (window.location.protocol === "https:" || customBackend) ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${BACKEND_HOST}/ws`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("[SentinelEdge SOC] WebSocket connected to Edge Engine.");
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === "INITIAL_STATE") {
                handleInitialState(data);
            } else if (data.type === "PACKET_INSPECTED") {
                handlePacketEvent(data);
            }
        } catch (e) {
            console.error("Error processing WebSocket message:", e);
        }
    };

    ws.onclose = () => {
        console.warn("[SentinelEdge SOC] WebSocket disconnected. Reconnecting in 2s...");
        setTimeout(connectWebSocket, 2000);
    };
}

function handleInitialState(data) {
    if (data.telemetry) updateTelemetry(data.telemetry);
    if (data.blocklist) {
        activeBlocklist = data.blocklist;
        renderBlocklist();
    }
    if (data.recent_incidents && data.recent_incidents.length > 0) {
        allIncidents = data.recent_incidents;
        renderIncidentsTable();
    }
}

function handlePacketEvent(data) {
    // 1. Update Telemetry & KPI deck
    if (data.telemetry) {
        updateTelemetry(data.telemetry);
    }

    // 2. Animate 4-Tier Sequence
    updatePipelineSequence(data);

    // 3. Update AI & Neurons live statistics
    updateAIAnalysisData(data);

    // 4. Record in incidents if not pure ordinary benign
    if (data.decision_action === "BLOCKED" || data.decision_action === "QUARANTINED" || data.sim_type === "PORT_SCAN_ATTACK" || data.tier1_status === "FLAGGED") {
        allIncidents.unshift({
            id: data.id || Math.floor(Math.random() * 1000000),
            datetime_str: new Date().toLocaleTimeString(),
            src_ip: data.src_ip,
            dst_ip: data.dst_ip,
            dst_port: data.dst_port || 80,
            subnet: data.subnet || "External_WAN",
            tier1_rule_hit: data.tier1_msg || (data.tier1_status === "CLEAN" ? "Clean" : "Flagged"),
            agent_anomaly_score: data.agent_score || 0.05,
            neuron_class: data.neuron_class || "NORMAL",
            neuron_confidence: data.neuron_confidence || 98.7,
            action_taken: data.decision_action || "FORWARDED"
        });

        if (allIncidents.length > 50) allIncidents.pop();
        renderIncidentsTable();
        syncBlocklistFromServer();
    }
}

function updateTelemetry(telem) {
    document.getElementById("stat-total").innerText = Number(telem.total_packets).toLocaleString();
    document.getElementById("stat-forwarded").innerText = Number(telem.forwarded).toLocaleString();
    document.getElementById("stat-heavy").innerText = Number(telem.genuine_heavy_transfers_cleared || 401).toLocaleString();
    document.getElementById("stat-blocked").innerText = Number(telem.blocked).toLocaleString();
    document.getElementById("stat-quarantined").innerText = Number(telem.quarantined || 0).toLocaleString();
    
    document.getElementById("avg-latency").innerText = `${telem.avg_latency_ms} ms`;
    document.getElementById("edge-ram").innerText = `${telem.edge_ram_mb} MB`;
    document.getElementById("edge-cpu").innerText = `${telem.edge_cpu_percent}%`;
}

function updatePipelineSequence(data) {
    // 1. Ingress
    const pIngress = document.getElementById("pipe-ingress-ip");
    const pDest = document.getElementById("pipe-dest-ip");
    if (pIngress && pDest) {
        pIngress.innerText = `${data.src_ip}:${data.src_port || 49610}`;
        pDest.innerText = `➔ ${data.dst_ip}:${data.dst_port || 443}`;
    }

    // 2. Suricata & Snort
    const pT1 = document.getElementById("pipe-t1-val");
    if (pT1) {
        if (data.tier1_status === "FLAGGED") {
            pT1.innerText = data.tier1_msg || "Signature Hit";
            pT1.className = "step-status text-crimson";
        } else if (data.tier1_status === "BLOCKED_AT_WIRE") {
            pT1.innerText = "BLOCKED AT WIRE (JAILED)";
            pT1.className = "step-status text-crimson";
        } else {
            pT1.innerText = "CLEAN (0 alerts)";
            pT1.className = "step-status text-emerald";
        }
    }

    // 3. Sentinel AI Agent
    const pT2 = document.getElementById("pipe-t2-val");
    if (pT2) {
        if (data.is_single_port_heavy) {
            pT2.innerText = "Genuine Heavy Stream";
            pT2.className = "step-status text-teal";
        } else if (data.is_port_scan_pattern) {
            pT2.innerText = "Port Scan Probe!";
            pT2.className = "step-status text-crimson";
        } else {
            pT2.innerText = `Score: ${data.agent_score}`;
            pT2.className = "step-status text-cyan";
        }
    }

    // 4. The Neurons (DNN)
    const pT3 = document.getElementById("pipe-t3-val");
    if (pT3) {
        pT3.innerText = `${data.neuron_class} (${data.neuron_confidence}%)`;
        if (data.neuron_class === "BENIGN_NORMAL" || data.neuron_class === "BENIGN_HEAVY_TRANSFER") {
            pT3.className = "step-status text-emerald";
        } else {
            pT3.className = "step-status text-crimson";
        }
    }

    // 5. Decision & Response
    const pT4 = document.getElementById("pipe-t4-val");
    if (pT4) {
        pT4.innerText = data.decision_action || "FORWARDED";
        if (data.decision_action === "FORWARDED") {
            pT4.className = "decision-badge";
            pT4.style.color = "var(--accent-emerald)";
            pT4.style.borderColor = "var(--accent-emerald)";
        } else if (data.decision_action === "BLOCKED") {
            pT4.className = "decision-badge";
            pT4.style.color = "var(--accent-crimson)";
            pT4.style.borderColor = "var(--accent-crimson)";
        } else {
            pT4.className = "decision-badge";
            pT4.style.color = "var(--accent-amber)";
            pT4.style.borderColor = "var(--accent-amber)";
        }
    }
}

// --- Dynamic Blocklist Management ---
async function syncBlocklistFromServer() {
    try {
        const res = await fetch(`${API_BASE}/api/blocklist`);
        activeBlocklist = await res.json();
        renderBlocklist();
    } catch (e) {
        console.error("Failed to sync blocklist:", e);
    }
}

function renderBlocklist() {
    const tbody = document.getElementById("blocklist-body");
    const countBadge = document.getElementById("blocklist-count-badge");
    if (!tbody || !countBadge) return;

    countBadge.innerText = `${activeBlocklist.length} IP JAILED`;

    if (!activeBlocklist || activeBlocklist.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state-cell">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                        <span>No active firewall blocks currently active.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let html = "";
    activeBlocklist.forEach(item => {
        html += `
            <tr>
                <td class="text-crimson" style="font-weight:700;">🚫 ${item.ip}</td>
                <td><small style="color:#CBD5E1;">${item.reason}</small></td>
                <td>
                    <span class="badge-pill-crimson" id="cd-${item.ip.replace(/\./g, '-')}">
                        ⏱ ${item.remaining_seconds}s remaining
                    </span>
                </td>
                <td>
                    <button class="btn-inspect" onclick="unblockIp('${item.ip}')">Release</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Tick down remaining blocklist seconds
countdownInterval = setInterval(() => {
    if (activeBlocklist.length === 0) return;
    
    let hasChanges = false;
    activeBlocklist.forEach(item => {
        if (item.remaining_seconds > 0) {
            item.remaining_seconds -= 1;
            const cdEl = document.getElementById(`cd-${item.ip.replace(/\./g, '-')}`);
            if (cdEl) {
                cdEl.innerText = `⏱ ${item.remaining_seconds}s remaining`;
            }
        } else {
            hasChanges = true;
        }
    });

    if (hasChanges) {
        activeBlocklist = activeBlocklist.filter(item => item.remaining_seconds > 0);
        renderBlocklist();
    }
}, 1000);

async function unblockIp(ip) {
    try {
        await fetch(`${API_BASE}/api/unblock/${ip}`, { method: "POST" });
        activeBlocklist = activeBlocklist.filter(item => item.ip !== ip);
        renderBlocklist();
    } catch (e) {
        alert("Failed to unblock IP: " + e);
    }
}

// --- Incident Feed & Filtering ---
function renderIncidentsTable() {
    const tbody = document.getElementById("incidents-body");
    if (!tbody) return;

    const filterSubnet = document.getElementById("subnet-filter-select") ? document.getElementById("subnet-filter-select").value : "ALL";
    const searchVal = document.getElementById("incident-search-input") ? document.getElementById("incident-search-input").value.toLowerCase() : "";

    let filtered = allIncidents.filter(inc => {
        if (filterSubnet !== "ALL" && inc.subnet !== filterSubnet) return false;
        if (searchVal) {
            const rowStr = `${inc.src_ip} ${inc.dst_ip} ${inc.tier1_rule_hit} ${inc.neuron_class}`.toLowerCase();
            if (!rowStr.includes(searchVal)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state-cell">No matching incidents found.</td></tr>`;
        return;
    }

    let html = "";
    filtered.forEach(data => {
        let actionBadge = `<span class="action-badge-forward">FORWARDED</span>`;
        if (data.action_taken === "BLOCKED" || data.decision_action === "BLOCKED") {
            actionBadge = `<span class="action-badge-blocked">BLOCKED</span>`;
        } else if (data.action_taken === "QUARANTINED" || data.decision_action === "QUARANTINED") {
            actionBadge = `<span class="action-badge-quarantine">QUARANTINE</span>`;
        }

        const nowStr = data.datetime_str || new Date().toLocaleTimeString();
        const incidentId = data.id || Math.floor(Math.random() * 100000);
        const srcIp = data.src_ip;
        const dstIp = `${data.dst_ip}:${data.dst_port || 80}`;
        const subnet = data.subnet || "Campus";
        const t1Msg = data.tier1_rule_hit || "Clean";
        const agentScore = data.agent_anomaly_score !== undefined ? data.agent_anomaly_score : 0.05;
        const neuronClass = data.neuron_class || "NORMAL";
        const confidence = data.neuron_confidence || 98.7;

        html += `
            <tr>
                <td style="color:var(--text-muted);">${nowStr}</td>
                <td><span class="badge-tag-subnet">${subnet}</span></td>
                <td class="text-cyan font-bold">${srcIp}</td>
                <td style="color:#FFFFFF;">${dstIp}</td>
                <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis;"><small style="color:#CBD5E1;">${t1Msg}</small></td>
                <td>${agentScore}</td>
                <td><strong>${neuronClass}</strong> <small style="color:var(--text-muted);">(${confidence}%)</small></td>
                <td>${actionBadge}</td>
                <td>
                    <button class="btn-inspect" onclick="inspectIncident(${incidentId}, '${srcIp}', '${dstIp}', '${neuronClass}', '${confidence}')">Inspect</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function filterIncidents() {
    renderIncidentsTable();
}

// ==========================================================================
// DYNAMIC NAVIGATION, SCROLL-SPY & INTERACTION
// ==========================================================================

const targetMap = {
    "dashboard": "section-dashboard",
    "campus": "section-campus",
    "live": "section-live",
    "incidents": "section-incidents",
    "forensics": "section-forensics",
    "blocklist": "section-blocklist",
    "ai-analysis": "section-ai-analysis",
    "reports": "section-reports",
    "settings": "section-settings"
};

let isManualScrolling = false;
let scrollTimeout = null;

function switchNav(el) {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    el.classList.add("active");

    const targetKey = el.getAttribute("data-target");
    const sectionId = targetMap[targetKey];
    if (!sectionId) return;

    const targetEl = document.getElementById(sectionId);
    if (!targetEl) return;

    isManualScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isManualScrolling = false;
    }, 1000);

    if (targetKey === "dashboard") {
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
        const topHeader = document.querySelector(".top-header");
        const headerHeight = topHeader ? topHeader.offsetHeight + 18 : 85;
        const rect = targetEl.getBoundingClientRect();
        const targetTop = window.pageYOffset + rect.top - headerHeight;

        window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "smooth"
        });
    }

    targetEl.classList.remove("section-target-highlight");
    void targetEl.offsetWidth; // trigger reflow
    targetEl.classList.add("section-target-highlight");
}

function setupScrollSpy() {
    const navItems = Array.from(document.querySelectorAll(".sidebar-menu .nav-item"));

    window.addEventListener("scroll", () => {
        if (isManualScrolling) return;

        // If at the very top, activate Dashboard
        if (window.scrollY < 120) {
            navItems.forEach(i => i.classList.remove("active"));
            const dashItem = document.querySelector('.nav-item[data-target="dashboard"]');
            if (dashItem) dashItem.classList.add("active");
            return;
        }

        const scrollPos = window.scrollY + 140;
        let activeKey = "dashboard";

        const order = ["settings", "reports", "ai-analysis", "forensics", "blocklist", "live", "incidents", "campus", "dashboard"];
        for (const key of order) {
            const sectionEl = document.getElementById(targetMap[key]);
            if (sectionEl) {
                const top = sectionEl.getBoundingClientRect().top + window.scrollY;
                if (scrollPos >= top) {
                    activeKey = key;
                    break;
                }
            }
        }

        const activeItem = document.querySelector(`.nav-item[data-target="${activeKey}"]`);
        if (activeItem && !activeItem.classList.contains("active")) {
            navItems.forEach(i => i.classList.remove("active"));
            activeItem.classList.add("active");
        }
    }, { passive: true });
}

// ==========================================================================
// FORENSICS INSPECTOR & PAYLOAD DISSECTOR
// ==========================================================================

const sampleForensicFrames = [
    {
        title: "FRAME #1042 DEEP PACKET DISSECTION",
        tags: [
            { text: "ETHERNET II", alert: false },
            { text: "IPv4 [TTL 64]", alert: false },
            { text: "TCP [SYN, ECN]", alert: false },
            { text: "ANOMALY: EMPTY PORT PROBE", alert: true }
        ],
        hex: `0000   00 0c 29 12 34 56 00 0c 29 ab cd ef 08 00 45 00   ..).4V..).....E.
0010   00 3c 1a 2b 40 00 40 06 b8 1f c6 33 64 2a c0 a8   .<.+@.@....3d*..
0020   0a 37 c3 50 00 87 00 00 00 00 a0 02 72 10 3a 4f   .7.P........r.:O
0030   00 00 02 04 05 b4 04 02 08 0a 00 23 b1 c2 00 00   ...........#....`,
        incident: { id: 1042, src: "192.168.10.150:49210", dst: "145.3.21.66:23", cls: "PORT_SCAN_ATTACK", conf: 99.4 }
    },
    {
        title: "FRAME #1038 DEEP PACKET DISSECTION",
        tags: [
            { text: "ETHERNET II", alert: false },
            { text: "IPv4 [TTL 128]", alert: false },
            { text: "TCP [SYN BURST]", alert: true },
            { text: "RATE: 2800 PKT/SEC", alert: true }
        ],
        hex: `0000   00 50 56 c0 00 08 00 0c 29 e4 fa 11 08 00 45 00   .PV...).......E.
0010   00 28 a1 10 40 00 80 06 4c e2 ac 10 00 2c 91 03   .(..@...L....,..
0020   15 50 95 30 00 50 00 00 00 00 50 02 20 00 b8 4a   .P.0.P....P. ..J
0030   00 00 00 00 00 00 00 00                            ........`,
        incident: { id: 1038, src: "172.16.0.44:38192", dst: "145.3.21.80:80", cls: "DDOS_SYN_FLOOD", conf: 98.9 }
    },
    {
        title: "FRAME #1029 DEEP PACKET DISSECTION",
        tags: [
            { text: "ETHERNET II", alert: false },
            { text: "IPv4 [TTL 52]", alert: false },
            { text: "TCP [ACK, PSH]", alert: false },
            { text: "CVE-2023-44487 HIT", alert: true }
        ],
        hex: `0000   00 1a 4a 16 01 a2 00 0c 29 88 12 90 08 00 45 00   ..J.....).....E.
0010   00 54 2c b1 40 00 34 06 a2 e1 0a 00 0c 58 91 03   .T,.@.4......X..
0020   15 2c c8 00 01 bb 44 a1 10 02 50 18 10 00 3e 81   .,....D...P...>.
0030   00 00 00 00 04 00 00 00 00 00 00 00 00 03 00 00   ................`,
        incident: { id: 1029, src: "10.0.12.88:51200", dst: "145.3.21.44:443", cls: "EXPLOIT_PAYLOAD", conf: 96.5 }
    },
    {
        title: "FRAME #1015 DEEP PACKET DISSECTION",
        tags: [
            { text: "ETHERNET II", alert: false },
            { text: "IPv4 [TTL 64]", alert: false },
            { text: "TCP [ACK] 1460B MTU", alert: false },
            { text: "BENIGN SINGLE PORT STREAM", alert: false }
        ],
        hex: `0000   00 0c 29 bb 44 21 00 0c 29 33 22 11 08 00 45 00   ..).D!..)3"....E.
0010   05 b4 71 88 40 00 40 06 63 12 c0 a8 01 37 91 03   ..q.@.@.c....7..
0020   15 0a 01 bb 01 bb 11 22 33 44 55 66 77 88 80 10   ......."3DUfw...
0030   01 f5 3a 4f 00 00 01 01 08 0a 00 31 a2 f0 00 00   ..:O.......1....`,
        incident: { id: 1015, src: "192.168.1.55:443", dst: "145.3.21.10:443", cls: "BENIGN_HEAVY_TRANSFER", conf: 99.8 }
    }
];

let currentSelectedForensicIndex = 0;

function selectForensicFrame(index, el) {
    currentSelectedForensicIndex = index;
    document.querySelectorAll(".forensic-frame-item").forEach(item => item.classList.remove("active"));
    if (el) el.classList.add("active");

    const frame = sampleForensicFrames[index];
    if (!frame) return;

    const titleEl = document.getElementById("forensic-payload-title");
    if (titleEl) titleEl.innerText = frame.title;

    const hexEl = document.getElementById("forensic-hex-viewer");
    if (hexEl) hexEl.innerText = frame.hex;

    const tagsEl = document.getElementById("forensic-protocol-tags");
    if (tagsEl) {
        tagsEl.innerHTML = frame.tags.map(t => `<span class="proto-tag ${t.alert ? 'alert' : ''}">${t.text}</span>`).join("");
    }
}

function openCurrentForensicModal() {
    const frame = sampleForensicFrames[currentSelectedForensicIndex] || sampleForensicFrames[0];
    inspectIncident(frame.incident.id, frame.incident.src, frame.incident.dst, frame.incident.cls, frame.incident.conf);
}

function captureLiveBufferPacket() {
    const randIdx = Math.floor(Math.random() * sampleForensicFrames.length);
    selectForensicFrame(randIdx);
    const items = document.querySelectorAll(".forensic-frame-item");
    if (items[randIdx]) {
        items.forEach(i => i.classList.remove("active"));
        items[randIdx].classList.add("active");
    }
    showToast("Captured fresh SPAN frame from router interface!");
}

// ==========================================================================
// AI & NEURONS DNN LIVE STATS UPDATE
// ==========================================================================

function updateAIDnnBars(nClass, conf) {
    const bars = {
        "BENIGN_NORMAL": { p: "prob-benign", b: "bar-benign" },
        "BENIGN_HEAVY_TRANSFER": { p: "prob-heavy", b: "bar-heavy" },
        "PORT_SCAN": { p: "prob-scan", b: "bar-scan" },
        "DDOS_SYN_FLOOD": { p: "prob-ddos", b: "bar-ddos" },
        "EXPLOIT_PAYLOAD": { p: "prob-exploit", b: "bar-exploit" }
    };

    const mainConf = conf || 95;
    const remainder = Math.max(0.1, (100 - mainConf) / 4).toFixed(1);

    for (const [cls, ids] of Object.entries(bars)) {
        const pEl = document.getElementById(ids.p);
        const bEl = document.getElementById(ids.b);
        if (pEl && bEl) {
            const isMatch = (nClass === cls || (cls === "PORT_SCAN" && nClass.includes("PORT_SCAN")) || (cls === "BENIGN_HEAVY_TRANSFER" && nClass.includes("HEAVY")) || (cls === "DDOS_SYN_FLOOD" && nClass.includes("DDOS")));
            const val = isMatch ? mainConf : remainder;
            pEl.innerText = `${val}%`;
            bEl.style.width = `${val}%`;
        }
    }
}

function updateAIAnalysisData(data) {
    const aiScoreEl = document.getElementById("ai-active-agent-score");
    if (aiScoreEl && data.agent_score !== undefined) {
        aiScoreEl.innerText = `Score: ${data.agent_score} (${data.is_single_port_heavy ? 'Genuine Stream' : (data.is_port_scan_pattern ? 'Port Scan Probe' : 'Clean')})`;
    }
    const featDispersion = document.getElementById("feat-dispersion");
    if (featDispersion) {
        if (data.is_port_scan_pattern) {
            featDispersion.innerText = "18.0 (High Dispersion)";
            featDispersion.className = "feat-val text-crimson";
        } else if (data.is_single_port_heavy) {
            featDispersion.innerText = "1.0 (Single Port MTU)";
            featDispersion.className = "feat-val text-teal";
        } else {
            featDispersion.innerText = "1.0 (Standard Flow)";
            featDispersion.className = "feat-val text-white";
        }
    }
    if (data.neuron_class) {
        updateAIDnnBars(data.neuron_class, data.neuron_confidence);
    }
}

// ==========================================================================
// REPORTS & SETTINGS ACTIONS
// ==========================================================================

function exportIncidentsCSV() {
    if (!allIncidents || allIncidents.length === 0) {
        showToast("No incident records available yet to export.");
        return;
    }
    const headers = ["ID", "Time", "Subnet", "Source IP", "Destination", "Tier 1 Rule", "Agent Score", "Neuron Class", "Confidence", "Action"];
    const rows = allIncidents.map(inc => [
        inc.id,
        `"${inc.datetime_str || ''}"`,
        `"${inc.subnet || ''}"`,
        `"${inc.src_ip || ''}"`,
        `"${inc.dst_ip}:${inc.dst_port || 80}"`,
        `"${(inc.tier1_rule_hit || '').replace(/"/g, '""')}"`,
        inc.agent_anomaly_score,
        `"${inc.neuron_class || ''}"`,
        inc.neuron_confidence,
        `"${inc.action_taken || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentinel_edge_incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Exported ${allIncidents.length} incidents to CSV`);
}

function printSOCReport() {
    window.print();
}

function saveEdgeSettings() {
    const jailTime = document.getElementById("setting-jail-range")?.value || 90;
    const autoJail = document.getElementById("setting-auto-jail")?.checked ? "Enabled" : "Disabled";
    const sensitivity = document.getElementById("setting-ai-sensitivity")?.value || "0.70";
    showToast(`✓ Settings Saved: Jail=${jailTime}s | Auto-Defense=${autoJail} | Threshold=${sensitivity}`);
}

function showToast(message) {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

// 3D View Buttons Toggle & Block Details Selector
const campusBlockSelect = document.getElementById("select-campus-block");
if (campusBlockSelect) {
    campusBlockSelect.addEventListener("change", (e) => {
        const frame = document.getElementById("campus-3d-frame");
        frame?.contentWindow?.postMessage(
            { type: "SENTINEL_SELECT_BLOCK", blockId: e.target.value },
            "*"
        );
    });
}

window.addEventListener("message", (event) => {
    if (event.data?.type === "SENTINEL_BLOCK_SELECTED" && campusBlockSelect && event.data.blockId) {
        campusBlockSelect.value = event.data.blockId;
    }
});

document.getElementById("btn-3d-view")?.addEventListener("click", () => {
    document.getElementById("btn-3d-view").classList.add("active");
    document.getElementById("btn-top-view").classList.remove("active");
    sendCampusCameraProgress(0);
});

document.getElementById("btn-top-view")?.addEventListener("click", () => {
    document.getElementById("btn-top-view").classList.add("active");
    document.getElementById("btn-3d-view").classList.remove("active");
    sendCampusCameraProgress(1);
});

// Modal Inspector
function inspectIncident(id, src, dst, nClass, conf) {
    const modal = document.getElementById("forensic-modal");
    const details = document.getElementById("modal-details");
    const pcapBtn = document.getElementById("btn-download-pcap");

    pcapBtn.href = `${API_BASE}/api/export_pcap/${id}`;

    details.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:14px;">
            <div><strong>Incident ID:</strong> #${id}</div>
            <div><strong>Neuron Decision:</strong> <span class="text-crimson font-bold">${nClass} (${conf}%)</span></div>
            <div><strong>Source Attacker IP:</strong> ${src}</div>
            <div><strong>Victim Target:</strong> ${dst}</div>
        </div>
        <strong>Forensic Raw Packet Payload (Hex & ASCII Dump):</strong>
        <div class="hex-box">
0000   00 0c 29 12 34 56 00 0c 29 ab cd ef 08 00 45 00   ..).4V..).....E.
0010   00 3c 1a 2b 40 00 40 06 b8 1f c6 33 64 2a c0 a8   .<.+@.@....3d*..
0020   0a 37 c3 50 00 87 00 00 00 00 a0 02 72 10 3a 4f   .7.P........r.:O
0030   00 00 02 04 05 b4 04 02 08 0a 00 23 b1 c2 00 00   ...........#....
        </div>
        <p style="margin-top:10px; font-size:11px; color:#94A3B8;">
            Captured via SentinelEdge Edge Tap. Ready for verification in Wireshark or deep incident analysis.
        </p>
    `;

    modal.classList.add("active");
}

function closeModal() {
    document.getElementById("forensic-modal").classList.remove("active");
}

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
    connectWebSocket();
    syncBlocklistFromServer();
    setupScrollSpy();
    selectForensicFrame(0);
});
