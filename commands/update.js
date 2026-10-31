const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const settings = require("../settings");
const isOwnerOrSudo = require("../lib/isOwner");
const { getPrimaryPrefix } = require("../lib/prefix");

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err)
        return reject(
          new Error((stderr || stdout || err.message || "").toString().trim()),
        );
      resolve((stdout || "").toString().trim());
    });
  });
}

async function hasGitRepo() {
  const gitDir = path.join(process.cwd(), ".git");
  if (!fs.existsSync(gitDir)) return false;
  try {
    await run("git --version");
    return true;
  } catch {
    return false;
  }
}

async function updateViaGit() {
  const oldRev = await run("git rev-parse HEAD").catch(() => "unknown");

  // Ensure origin is pointed to the canonical repository
  try {
    const remotes = await run("git remote -v").catch(() => "");
    if (!remotes.includes("github.com/LilGabrielDev/gabrielmd")) {
      await run("git remote set-url origin https://github.com/LilGabrielDev/gabrielmd.git").catch(async () => {
        await run("git remote add origin https://github.com/LilGabrielDev/gabrielmd.git").catch(() => {});
      });
    }
  } catch {}

  await run("git fetch origin --prune");

  // Determine main or master branch
  let targetRef = "origin/main";
  try {
    await run("git rev-parse --verify origin/main");
  } catch {
    targetRef = "origin/master";
  }

  const newRev = await run(`git rev-parse ${targetRef}`);
  const alreadyUpToDate = oldRev === newRev;
  const commits = alreadyUpToDate
    ? ""
    : await run(`git log --pretty=format:"%h %s (%an)" ${oldRev}..${newRev}`).catch(() => "");
  const files = alreadyUpToDate
    ? ""
    : await run(`git diff --name-status ${oldRev} ${newRev}`).catch(() => "");

  await run(`git reset --hard ${newRev}`);
  await run("git clean -fd");

  // Install any updated dependencies
  await run("npm install --no-audit --no-fund --legacy-peer-deps").catch(() => {});

  return { oldRev, newRev, alreadyUpToDate, commits, files };
}

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    headers: {
      "User-Agent": "GabrielMD-Updater/1.0",
      Accept: "*/*",
    },
    maxRedirects: 10,
    timeout: 30000,
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      writer.close(resolve);
    });
    writer.on("error", (err) => {
      try {
        writer.close(() => {});
      } catch {}
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function extractZip(zipPath, outDir) {
  if (process.platform === "win32") {
    const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir.replace(/\\/g, "/")}' -Force"`;
    await run(cmd);
    return;
  }

  // Linux / macOS: try unzip, then 7z, then busybox, then tar
  try {
    await run("command -v unzip");
    await run(`unzip -o -q '${zipPath}' -d '${outDir}'`);
    return;
  } catch {}

  try {
    await run("command -v 7z");
    await run(`7z x -y '${zipPath}' -o'${outDir}'`);
    return;
  } catch {}

  try {
    await run("busybox unzip -h");
    await run(`busybox unzip -o -q '${zipPath}' -d '${outDir}'`);
    return;
  } catch {}

  try {
    await run(`tar -xf '${zipPath}' -C '${outDir}'`);
    return;
  } catch {}

  throw new Error(
    "No system extraction tool found (unzip/7z/busybox/tar). Please install unzip on your server.",
  );
}

function copyRecursive(src, dest, ignore = [], relative = "", outList = []) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (ignore.includes(entry)) continue;
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.lstatSync(s);
    if (stat.isDirectory()) {
      copyRecursive(s, d, ignore, path.join(relative, entry), outList);
    } else {
      fs.copyFileSync(s, d);
      if (outList) outList.push(path.join(relative, entry).replace(/\\/g, "/"));
    }
  }
}

function preserveUserSettings() {
  const settingsPath = path.join(process.cwd(), "settings.js");
  if (!fs.existsSync(settingsPath)) return;

  try {
    const current = require("../settings");
    let content = fs.readFileSync(settingsPath, "utf8");

    if (current.ownerNumber) {
      content = content.replace(
        /ownerNumber:\s*["'][^"']*["']/g,
        `ownerNumber: "${current.ownerNumber}"`,
      );
    }
    if (current.botOwner) {
      content = content.replace(
        /botOwner:\s*["'][^"']*["']/g,
        `botOwner: "${current.botOwner}"`,
      );
    }
    if (current.botName) {
      content = content.replace(
        /botName:\s*["'][^"']*["']/g,
        `botName: "${current.botName}"`,
      );
    }
    if (current.packname) {
      content = content.replace(
        /packname:\s*["'][^"']*["']/g,
        `packname: "${current.packname}"`,
      );
    }

    fs.writeFileSync(settingsPath, content);
  } catch {}
}

async function updateViaZip(sock, chatId, message, zipOverride) {
  const zipUrl = (
    zipOverride ||
    settings.updateZipUrl ||
    process.env.UPDATE_ZIP_URL ||
    "https://github.com/LilGabrielDev/gabrielmd/archive/refs/heads/main.zip"
  ).trim();

  const tmpDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const zipPath = path.join(tmpDir, "update.zip");
  const extractTo = path.join(tmpDir, "update_extract");

  if (fs.existsSync(extractTo)) {
    fs.rmSync(extractTo, { recursive: true, force: true });
  }

  // 1. Download
  await downloadFile(zipUrl, zipPath);

  // 2. Extract
  await extractZip(zipPath, extractTo);

  // 3. Find extracted root (GitHub archives create a single folder like gabrielmd-main)
  const entries = fs.readdirSync(extractTo).map((n) => path.join(extractTo, n));
  const srcRoot =
    entries.length === 1 && fs.lstatSync(entries[0]).isDirectory()
      ? entries[0]
      : extractTo;

  // 4. Copy over files, preserving local state, session, and env
  const ignore = [
    "node_modules",
    ".git",
    "session",
    "tmp",
    "temp",
    "data",
    ".env",
    ".env.local",
    "baileys_store.json",
    "package-lock.json",
    "metadata.json",
  ];
  const copied = [];
  copyRecursive(srcRoot, process.cwd(), ignore, "", copied);

  // 5. Restore user settings customizations
  preserveUserSettings();

  // 6. Install any new or updated packages
  try {
    await run("npm install --no-audit --no-fund --legacy-peer-deps");
  } catch (npmErr) {
    console.warn("[update] npm install warning:", npmErr.message);
  }

  // 7. Cleanup temp files
  try {
    fs.rmSync(extractTo, { recursive: true, force: true });
    fs.rmSync(zipPath, { force: true });
  } catch {}

  return { copiedFiles: copied };
}

async function restartProcess(sock, chatId, message) {
  try {
    // Attempt PM2 restart first if managed by PM2
    await run("pm2 restart all");
    return;
  } catch {}

  // On Katabump, Pterodactyl panels, or Docker, process.exit triggers auto-restart.
  // Wait 1500ms to ensure Baileys WebSocket flushes the message packet.
  setTimeout(() => {
    process.exit(0);
  }, 1500);
}

async function updateCommand(sock, chatId, message, zipOverride) {
  const senderId = message.key.participant || message.key.remoteJid;
  const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

  if (!message.key.fromMe && !isOwner) {
    await sock.sendMessage(
      chatId,
      { text: "🔐 Only bot owner or sudo can use .update" },
      { quoted: message },
    );
    return;
  }

  try {
    await sock.sendMessage(
      chatId,
      { text: "🔄 *Updating Gabriel MD Bot...*\nFetching latest code from `LilGabrielDev/gabrielmd`. Please wait..." },
      { quoted: message },
    );

    let summaryText = "";

    if (await hasGitRepo()) {
      const { oldRev, newRev, alreadyUpToDate, commits } = await updateViaGit();
      if (alreadyUpToDate) {
        summaryText = `✅ *Bot is already up to date!*\nCommit: \`${newRev.slice(0, 7)}\``;
      } else {
        const commitInfo = commits ? `\n\n*Recent Commits:*\n${commits.split("\n").slice(0, 5).join("\n")}` : "";
        summaryText = `✅ *Update Applied Successfully!*\nUpdated from \`${oldRev.slice(0, 7)}\` → \`${newRev.slice(0, 7)}\`${commitInfo}`;
      }
    } else {
      const { copiedFiles } = await updateViaZip(
        sock,
        chatId,
        message,
        zipOverride,
      );
      summaryText = `✅ *Update Applied Successfully via Archive!*\n• Files updated: ${copiedFiles.length}\n• Repository: \`LilGabrielDev/gabrielmd\``;
    }

    const currentVersion = settings.version || "1.0.1";
    await sock.sendMessage(
      chatId,
      {
        text: `${summaryText}\n\n🤖 *Gabriel MD v${currentVersion}*\nRestarting bot process now...\n_Use ${getPrimaryPrefix()}ping after restart to verify online status._`,
      },
      { quoted: message },
    );

    await restartProcess(sock, chatId, message);
  } catch (err) {
    console.error("Update failed:", err);
    await sock.sendMessage(
      chatId,
      {
        text: `❌ *Update Failed*\n\nReason: ${err.message || String(err)}\n\n_If updating on a panel without git, verify your internet connection or use .update <direct-zip-url>._`,
      },
      { quoted: message },
    );
  }
}

module.exports = updateCommand;
