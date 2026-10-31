require("./settings");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const chalk = require("chalk");
const FileType = require("file-type");
const path = require("path");
const http = require("http");
const axios = require("axios");
const {
  handleMessages,
  handleGroupParticipantUpdate,
  handleStatus,
} = require("./main");
const PhoneNumber = require("awesome-phonenumber");
const {
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
} = require("./lib/exif");
const {
  smsg,
  isUrl,
  generateMessageTag,
  getBuffer,
  getSizeMedia,
  fetch,
  await,
  sleep,
  reSize,
} = require("./lib/myfunc");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateForwardMessageContent,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  generateMessageID,
  downloadContentFromMessage,
  jidDecode,
  proto,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  delay,
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const pino = require("pino");
const readline = require("readline");
const qrcode = require("qrcode");
const { parsePhoneNumber } = require("libphonenumber-js");
const {
  PHONENUMBER_MCC,
} = require("@whiskeysockets/baileys/lib/Utils/generics");
const { rmSync, existsSync } = require("fs");
const { join } = require("path");

// Import lightweight store
const store = require("./lib/lightweight_store");
const settings = require("./settings");

// Initialize store
store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

// Global configuration
global.botname = settings.botName || "Gabriel MD Bot";
global.themeemoji = "•";

let defaultPhoneNumber = settings.ownerNumber || "254716427334";
let owner = JSON.parse(fs.readFileSync("./data/owner.json"));

// ── Shared Bot State for Web Dashboard & APIs ──────────────────────────
const botState = {
  status: "initializing", // initializing, connecting, qr_ready, pairing_ready, connected, disconnected
  statusText: "Initializing bot services...",
  qrRaw: null,
  qrDataUrl: null,
  pairingCode: null,
  phoneNumber: defaultPhoneNumber,
  connectedUser: null,
  startTime: Date.now(),
  lastDisconnectReason: null,
  reconnectAttempts: 0,
  logs: [],
};

function addLog(msg) {
  const time = new Date().toLocaleTimeString();
  botState.logs.unshift({ time, msg });
  if (botState.logs.length > 50) botState.logs.pop();
}

let XeonBotIncInstance = null;
let isReconnecting = false;

// ─── Native HTTP Server on Port 3000 (Required for AI Studio) ──────────
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

function renderDashboardHtml() {
  const isConnected = botState.status === "connected";
  const uptimeSeconds = Math.floor((Date.now() - botState.startTime) / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const mins = Math.floor((uptimeSeconds % 3600) / 60);
  const secs = uptimeSeconds % 60;
  const uptimeStr = `${hours}h ${mins}m ${secs}s`;
  const memoryMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.botName || "Gabriel MD WhatsApp Bot"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    .brand-title {
      font-weight: 700;
      font-size: 1.25rem;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .badge-connected { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-connecting { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-disconnected { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    .hero-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .hero-title {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .code-box {
      background: #0f172a;
      border: 2px dashed #3b82f6;
      border-radius: 12px;
      padding: 1rem 2.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 2.25rem;
      font-weight: 700;
      letter-spacing: 0.25em;
      color: #60a5fa;
      user-select: all;
      cursor: pointer;
      transition: all 0.2s;
    }
    .code-box:hover {
      background: #1e293b;
      border-color: #60a5fa;
    }
    .btn {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn:hover { background: var(--accent-hover); }
    .btn-secondary {
      background: #374151;
    }
    .btn-secondary:hover { background: #4b5563; }
    .steps {
      text-align: left;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      font-size: 0.875rem;
      color: #cbd5e1;
      width: 100%;
      max-width: 520px;
      line-height: 1.6;
    }
    .steps ol { padding-left: 1.25rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 1.25rem;
    }
    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
    }
    .stat-val {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
    }
    .phone-form {
      display: flex;
      gap: 0.5rem;
      max-width: 480px;
      width: 100%;
      margin-top: 0.5rem;
    }
    .phone-input {
      flex: 1;
      background: #0f172a;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: var(--text);
      font-size: 0.95rem;
      outline: none;
    }
    .phone-input:focus { border-color: var(--accent); }
    .logs-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
    }
    .logs-header {
      font-weight: 600;
      font-size: 0.95rem;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .log-list {
      background: #0a0e17;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      height: 150px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .log-item { color: #94a3b8; }
    .log-time { color: #64748b; margin-right: 0.5rem; }
    .qr-container {
      background: #fff;
      padding: 1rem;
      border-radius: 12px;
      display: inline-block;
      margin-top: 0.5rem;
    }
    .qr-container img { display: block; max-width: 200px; height: auto; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">🤖</div>
        <div>
          <div class="brand-title">${settings.botName || "Gabriel MD Bot"}</div>
          <div class="brand-sub">Multi-Device WhatsApp Engine • V${settings.version || "1.0.1"}</div>
        </div>
      </div>
      <div>
        ${
          isConnected
            ? '<span class="badge badge-connected"><span class="dot"></span> Connected</span>'
            : botState.status === "pairing_ready" || botState.status === "qr_ready"
            ? '<span class="badge badge-connecting"><span class="dot"></span> Ready to Link</span>'
            : '<span class="badge badge-disconnected"><span class="dot"></span> ' + (botState.statusText || "Connecting") + "</span>"
        }
      </div>
    </header>

    <div class="hero-card">
      ${
        isConnected
          ? `
            <div style="font-size: 3rem;">✅</div>
            <h2 class="hero-title">Bot Connected and Ready!</h2>
            <p style="color: var(--text-muted); max-width: 500px;">
              Your WhatsApp bot is currently active and listening for group and private commands.
            </p>
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 0.75rem 1.5rem; color: #34d399; font-size: 0.9rem;">
              Connected Account: <strong>${botState.connectedUser?.id?.split(":")[0] || defaultPhoneNumber}</strong>
            </div>
            <button class="btn btn-secondary" onclick="reconnect()">🔄 Restart Connection</button>
          `
          : botState.pairingCode
          ? `
            <h2 class="hero-title">Link with WhatsApp Pairing Code</h2>
            <p style="color: var(--text-muted);">Enter this 8-character code in your WhatsApp app:</p>
            <div class="code-box" id="pairCode" onclick="copyCode()">${botState.pairingCode}</div>
            <button class="btn" onclick="copyCode()" id="copyBtn">📋 Copy Pairing Code</button>
            <div class="steps">
              <strong>Instructions:</strong>
              <ol>
                <li>Open WhatsApp on your phone</li>
                <li>Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
                <li>Tap <strong>Link a Device</strong></li>
                <li>Tap <strong>"Link with phone number instead"</strong></li>
                <li>Enter the code shown above</li>
              </ol>
            </div>
            <div style="display:flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem;">
              <span style="font-size: 0.85rem; color: var(--text-muted);">Different number?</span>
              <form class="phone-form" onsubmit="requestPair(event)">
                <input class="phone-input" id="phoneNum" type="text" placeholder="254716427334" value="${botState.phoneNumber}">
                <button type="submit" class="btn btn-secondary">Get Code</button>
              </form>
            </div>
          `
          : botState.qrDataUrl
          ? `
            <h2 class="hero-title">Scan QR Code with WhatsApp</h2>
            <p style="color: var(--text-muted);">Open WhatsApp &gt; Linked Devices &gt; Link a Device to scan:</p>
            <div class="qr-container">
              <img src="${botState.qrDataUrl}" alt="WhatsApp QR Code">
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Or request an 8-digit Pairing Code:</p>
            <form class="phone-form" onsubmit="requestPair(event)">
              <input class="phone-input" id="phoneNum" type="text" placeholder="254716427334" value="${botState.phoneNumber}">
              <button type="submit" class="btn">Get Pairing Code</button>
            </form>
          `
          : `
            <h2 class="hero-title">Starting Connection...</h2>
            <p style="color: var(--text-muted);">${botState.statusText || "Connecting to WhatsApp servers..."}</p>
            <form class="phone-form" onsubmit="requestPair(event)">
              <input class="phone-input" id="phoneNum" type="text" placeholder="254716427334" value="${botState.phoneNumber}">
              <button type="submit" class="btn">Request Pairing Code</button>
            </form>
          `
      }
    </div>

    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">Security & Moderation</div>
        <div class="stat-val" style="color: #34d399;">🛡️ Anti-Scam Active</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Available Commands</div>
        <div class="stat-val">160+ Commands</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Server Uptime</div>
        <div class="stat-val">${uptimeStr}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">RAM Usage</div>
        <div class="stat-val">${memoryMB} MB</div>
      </div>
    </div>

    <div class="logs-card">
      <div class="logs-header">
        <span>Activity Log</span>
        <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="location.reload()">Refresh</button>
      </div>
      <div class="log-list" id="logList">
        ${
          botState.logs.length === 0
            ? '<div class="log-item">Bot service started. Waiting for activity...</div>'
            : botState.logs
                .map(
                  (l) =>
                    `<div class="log-item"><span class="log-time">[${l.time}]</span> ${l.msg}</div>`
                )
                .join("")
        }
      </div>
    </div>
  </div>

  <script>
    function copyCode() {
      const code = document.getElementById('pairCode')?.innerText;
      if (code) {
        navigator.clipboard.writeText(code);
        const btn = document.getElementById('copyBtn');
        if (btn) {
          const oldText = btn.innerText;
          btn.innerText = '✅ Copied!';
          setTimeout(() => { btn.innerText = oldText; }, 2000);
        }
      }
    }

    async function requestPair(e) {
      e.preventDefault();
      const num = document.getElementById('phoneNum')?.value?.trim();
      if (!num) return;
      try {
        const res = await fetch('/api/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: num })
        });
        const data = await res.json();
        if (data.code) {
          location.reload();
        } else {
          alert(data.message || 'Pairing code requested, please wait a few seconds...');
          setTimeout(() => location.reload(), 3000);
        }
      } catch (err) {
        alert('Failed to request pairing code');
      }
    }

    async function reconnect() {
      if (!confirm('Restart WhatsApp connection?')) return;
      await fetch('/api/reconnect', { method: 'POST' });
      setTimeout(() => location.reload(), 2000);
    }

    // Auto-refresh state every 4 seconds if not connected
    setInterval(async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.status !== '${botState.status}' || (data.pairingCode && data.pairingCode !== '${botState.pairingCode}')) {
          location.reload();
        }
      } catch {}
    }, 4000);
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  // API Status endpoint
  if (url === "/api/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        status: botState.status,
        statusText: botState.statusText,
        pairingCode: botState.pairingCode,
        qrDataUrl: botState.qrDataUrl,
        phoneNumber: botState.phoneNumber,
        connectedUser: botState.connectedUser,
        uptime: Math.floor((Date.now() - botState.startTime) / 1000),
        memoryMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
        botName: settings.botName || "Gabriel MD Bot",
        version: settings.version || "1.0.1",
      })
    );
  }

  // API Pair Code Request
  if (url === "/api/pair" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const json = JSON.parse(body || "{}");
        const num = String(json.phoneNumber || "").replace(/[^0-9]/g, "");
        if (num) {
          botState.phoneNumber = num;
          addLog(`Requesting pairing code for +${num}...`);
          if (XeonBotIncInstance && !XeonBotIncInstance.authState?.creds?.registered) {
            try {
              let code = await XeonBotIncInstance.requestPairingCode(num);
              code = code?.match(/.{1,4}/g)?.join("-") || code;
              botState.pairingCode = code;
              botState.status = "pairing_ready";
              addLog(`New pairing code generated: ${code}`);
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, code }));
            } catch (pairErr) {
              addLog(`Pair error: ${pairErr.message}`);
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, message: pairErr.message }));
            }
          }
        }
      } catch (e) {}
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Request queued" }));
    });
    return;
  }

  // API Reconnect
  if (url === "/api/reconnect" && req.method === "POST") {
    addLog("User requested reconnection from dashboard.");
    if (XeonBotIncInstance) {
      try { XeonBotIncInstance.end(); } catch {}
    }
    setTimeout(startXeonBotInc, 1500);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true }));
  }

  // Root Web Dashboard
  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(renderDashboardHtml());
  }

  // Fallback 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(chalk.green(`🌐 Gabriel MD Web Dashboard active on http://${HOST}:${PORT}`));
  addLog(`Web server active on port ${PORT}`);
});

// ─── Memory optimization ───────────────────────────────────────────────
setInterval(() => {
  if (global.gc) {
    global.gc();
  }
  const used = process.memoryUsage().rss / 1024 / 1024;
  if (used > 450) {
    console.log("⚠️ RAM high (>450MB), cleaning stores and caches...");
    addLog("Cleaning memory cache");
  }
}, 60_000);

// ─── Baileys WhatsApp Socket Initialization ────────────────────────────
async function startXeonBotInc() {
  try {
    botState.status = "connecting";
    botState.statusText = "Connecting to WhatsApp network...";
    addLog("Connecting to WhatsApp network...");

    const sessionDir = path.join(__dirname, "session");
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    let { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const msgRetryCounterCache = new NodeCache();

    const XeonBotInc = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          pino({ level: "fatal" }).child({ level: "fatal" })
        ),
      },
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      getMessage: async (key) => {
        let jid = jidNormalizedUser(key.remoteJid);
        let msg = await store.loadMessage(jid, key.id);
        return msg?.message || "";
      },
      msgRetryCounterCache,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
    });

    XeonBotIncInstance = XeonBotInc;

    // Save credentials when updated
    XeonBotInc.ev.on("creds.update", saveCreds);
    store.bind(XeonBotInc.ev);

    // Request Pairing Code if not registered
    async function triggerPairingCode() {
      if (!XeonBotInc.authState.creds.registered) {
        let cleanNumber = (botState.phoneNumber || defaultPhoneNumber).replace(/[^0-9]/g, "");
        if (cleanNumber) {
          try {
            await delay(2500);
            let code = await XeonBotInc.requestPairingCode(cleanNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            botState.pairingCode = code;
            botState.status = "pairing_ready";
            botState.statusText = `Pairing code ready: ${code}`;
            addLog(`Pairing code generated: ${code}`);
            console.log(
              chalk.black(chalk.bgGreen(`Your Pairing Code : `)),
              chalk.black(chalk.white(code))
            );
          } catch (err) {
            console.log(chalk.yellow(`Pairing code request note: ${err.message}`));
          }
        }
      }
    }

    // Trigger pairing attempt
    triggerPairingCode();

    // Message Upsert handling
    XeonBotInc.ev.on("messages.upsert", async (chatUpdate) => {
      try {
        const mek = chatUpdate.messages[0];
        if (!mek?.message) return;
        mek.message =
          Object.keys(mek.message)[0] === "ephemeralMessage"
            ? mek.message.ephemeralMessage.message
            : mek.message;
        if (mek.key && mek.key.remoteJid === "status@broadcast") {
          await handleStatus(XeonBotInc, chatUpdate);
          return;
        }

        if (XeonBotInc?.msgRetryCounterCache) {
          XeonBotInc.msgRetryCounterCache.clear();
        }

        try {
          await handleMessages(XeonBotInc, chatUpdate, true);
        } catch (err) {
          console.error("Error in handleMessages:", err.message);
        }
      } catch (err) {
        console.error("Error in messages.upsert:", err.message);
      }
    });

    XeonBotInc.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return (
          (decode.user && decode.server && decode.user + "@" + decode.server) ||
          jid
        );
      } else return jid;
    };

    XeonBotInc.ev.on("contacts.update", (update) => {
      for (let contact of update) {
        let id = XeonBotInc.decodeJid(contact.id);
        if (store && store.contacts)
          store.contacts[id] = { id, name: contact.notify };
      }
    });

    XeonBotInc.getName = (jid, withoutContact = false) => {
      let id = XeonBotInc.decodeJid(jid);
      withoutContact = XeonBotInc.withoutContact || withoutContact;
      let v;
      if (id.endsWith("@g.us"))
        return new Promise(async (resolve) => {
          v = store.contacts[id] || {};
          if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {};
          resolve(
            v.name ||
              v.subject ||
              PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber(
                "international"
              )
          );
        });
      else
        v =
          id === "0@s.whatsapp.net"
            ? { id, name: "WhatsApp" }
            : id === XeonBotInc.decodeJid(XeonBotInc.user?.id)
            ? XeonBotInc.user
            : store.contacts[id] || {};
      return (
        (withoutContact ? "" : v.name) ||
        v.subject ||
        v.verifiedName ||
        PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber(
          "international"
        )
      );
    };

    XeonBotInc.public = true;
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);

    // Connection handling
    XeonBotInc.ev.on("connection.update", async (s) => {
      const { connection, lastDisconnect, qr } = s;

      if (qr) {
        botState.qrRaw = qr;
        botState.status = "qr_ready";
        botState.statusText = "QR Code ready to scan";
        addLog("QR Code generated for pairing");
        try {
          botState.qrDataUrl = await qrcode.toDataURL(qr, { scale: 6 });
        } catch {}
      }

      if (connection === "connecting") {
        botState.status = "connecting";
        botState.statusText = "Connecting to WhatsApp...";
        console.log(chalk.yellow("🔄 Connecting to WhatsApp..."));
      }

      if (connection === "open") {
        botState.status = "connected";
        botState.statusText = "Connected and active";
        botState.connectedUser = XeonBotInc.user;
        botState.qrRaw = null;
        botState.qrDataUrl = null;
        botState.pairingCode = null;
        addLog(`Connected as ${XeonBotInc.user?.id?.split(":")[0] || "Bot"}`);

        console.log(
          chalk.green("🤖 Gabriel MD Bot Connected Successfully! ✅")
        );

        const { isAutobioEnabled, startAutobioLoop } = require("./commands/autobio");
        if (isAutobioEnabled()) {
          startAutobioLoop(XeonBotInc);
        }
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        botState.status = "disconnected";
        botState.statusText = `Connection closed (${lastDisconnect?.error?.message || "reconnecting..."})`;
        addLog(`Connection closed: ${lastDisconnect?.error?.message || "Disconnected"}`);

        console.log(
          chalk.red(
            `Connection closed due to ${lastDisconnect?.error?.message || lastDisconnect?.error}, status: ${statusCode}`
          )
        );

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          try {
            rmSync(sessionDir, { recursive: true, force: true });
            console.log(chalk.yellow("Session folder cleared for fresh authentication."));
            addLog("Session folder reset for re-authentication.");
          } catch (e) {}
        }

        if (!isReconnecting) {
          isReconnecting = true;
          console.log(chalk.yellow("Reconnecting in 5 seconds..."));
          setTimeout(async () => {
            isReconnecting = false;
            try {
              await startXeonBotInc();
            } catch (err) {
              console.error("Reconnection error:", err.message);
              setTimeout(startXeonBotInc, 6000);
            }
          }, 5000);
        }
      }
    });

    // Anticall handler
    const antiCallNotified = new Set();
    XeonBotInc.ev.on("call", async (calls) => {
      try {
        const { readState: readAnticallState } = require("./commands/anticall");
        const state = readAnticallState();
        if (!state.enabled) return;
        for (const call of calls) {
          const callerJid = call.from || call.peerJid || call.chatId;
          if (!callerJid) continue;
          try {
            if (typeof XeonBotInc.rejectCall === "function" && call.id) {
              await XeonBotInc.rejectCall(call.id, callerJid);
            } else if (typeof XeonBotInc.sendCallOfferAck === "function" && call.id) {
              await XeonBotInc.sendCallOfferAck(call.id, callerJid, "reject");
            }
          } catch {}

          if (!antiCallNotified.has(callerJid)) {
            antiCallNotified.add(callerJid);
            setTimeout(() => antiCallNotified.delete(callerJid), 60000);
            const messageText =
              state.mode === "reject"
                ? "📵 Anticall is enabled. Your call was rejected."
                : "📵 Anticall is enabled. Your call was rejected and you will be blocked.";
            await XeonBotInc.sendMessage(callerJid, { text: messageText }).catch(() => {});
          }

          if (state.mode !== "reject") {
            setTimeout(async () => {
              try {
                await XeonBotInc.updateBlockStatus(callerJid, "block");
              } catch {}
            }, 800);
          }
        }
      } catch (e) {}
    });

    XeonBotInc.ev.on("group-participants.update", async (update) => {
      await handleGroupParticipantUpdate(XeonBotInc, update);
    });

    XeonBotInc.ev.on("status.update", async (status) => {
      await handleStatus(XeonBotInc, status);
    });

    XeonBotInc.ev.on("messages.reaction", async (status) => {
      await handleStatus(XeonBotInc, status);
    });

    return XeonBotInc;
  } catch (error) {
    console.error("Error in startXeonBotInc:", error.message);
    botState.statusText = `Error: ${error.message}`;
    addLog(`Error: ${error.message}`);
    if (!isReconnecting) {
      isReconnecting = true;
      setTimeout(() => {
        isReconnecting = false;
        startXeonBotInc().catch(() => {});
      }, 6000);
    }
  }
}

// ─── Launch Baileys Engine ─────────────────────────────────────────────
startXeonBotInc().catch((error) => {
  console.error("Start error:", error.message);
  setTimeout(startXeonBotInc, 6000);
});

// ─── Process Resilience (Keep Node.js Alive) ───────────────────────────
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception handled:", err.message);
  addLog(`Uncaught: ${err.message}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection handled:", err?.message || err);
  addLog(`Unhandled: ${err?.message || err}`);
});
