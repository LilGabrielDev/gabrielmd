const fs = require("fs");
const path = require("path");
const settings = require("../settings");
const { DEFAULT_PREFIX } = require("../lib/prefix");

function formatPrefixForSettings(prefix) {
  return Array.isArray(prefix)
    ? `[${prefix.map((p) => JSON.stringify(p)).join(", ")}]`
    : JSON.stringify(prefix);
}

function updatePrefixInSettingsFile(prefix) {
  const settingsPath = path.join(__dirname, "../settings.js");
  const settingsContent = fs.readFileSync(settingsPath, "utf8");
  const prefixString = formatPrefixForSettings(prefix);
  const prefixLine = /^(\s*prefix:\s*)(\[[^\]]*\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')(\s*,.*)$/m;

  if (!prefixLine.test(settingsContent)) {
    throw new Error("Could not find a valid prefix line in settings.js");
  }

  const updatedContent = settingsContent.replace(
    prefixLine,
    `$1${prefixString}$3`,
  );

  fs.writeFileSync(settingsPath, updatedContent, "utf8");
}

async function setprefixCommand(sock, chatId, message, args) {
  // If called with no args, show current prefix instead of resetting
  if (args.length === 0) {
    const currentPrefix = settings.prefix || DEFAULT_PREFIX;
    const displayPrefix = Array.isArray(currentPrefix) ? currentPrefix.join("  ") : currentPrefix;
    const examplePrefix = Array.isArray(currentPrefix) ? currentPrefix[0] : currentPrefix;
    await sock.sendMessage(
      chatId,
      {
        text: `ℹ️ *Current Prefix*: *${displayPrefix}*\n\n💡 Example: type *${examplePrefix}menu* to open the command menu.\n\n🔧 To change it: *.setprefix <new_prefix>*\nExample: *.setprefix !*`,
      },
      { quoted: message },
    );
    return;
  }

  const newPrefix = args.length === 1 ? args[0] : args;

  try {
    updatePrefixInSettingsFile(newPrefix);
    settings.prefix = newPrefix;

    const displayPrefix = Array.isArray(newPrefix) ? newPrefix.join("  ") : newPrefix;
    const examplePrefix = Array.isArray(newPrefix) ? newPrefix[0] : newPrefix;
    await sock.sendMessage(
      chatId,
      {
        text: `✅ *Prefix updated successfully!*\n\n📌 New prefix: *${displayPrefix}*\n\n💡 Example: type *${examplePrefix}menu* to open the command menu.\n\nAll commands now use the new prefix immediately.`,
      },
      { quoted: message },
    );
  } catch (error) {
    console.error("Error updating prefix:", error);
    await sock.sendMessage(
      chatId,
      { text: "❌ Failed to update prefix in settings.js" },
      { quoted: message },
    );
  }
}

module.exports = setprefixCommand;
