const settings = require("../settings");

const DEFAULT_PREFIX = ".";

function getPrefixSetting() {
  return settings.prefix ?? DEFAULT_PREFIX;
}

function getPrefixes(prefixSetting) {
  const setting = prefixSetting ?? getPrefixSetting();
  const prefixes = Array.isArray(setting)
    ? setting.filter(Boolean)
    : [setting].filter(Boolean);

  if (prefixes.length === 0) return [DEFAULT_PREFIX];

  return [...prefixes].sort((a, b) => b.length - a.length);
}

function getPrimaryPrefix(prefixSetting) {
  // getPrefixes returns longest-first; index 0 is the primary (first-defined) prefix
  const prefixes = getPrefixes(prefixSetting);
  return prefixes[0] || DEFAULT_PREFIX;
}

function getMessageText(message) {
  return (
    message.message?.conversation?.trim() ||
    message.message?.extendedTextMessage?.text?.trim() ||
    message.message?.imageMessage?.caption?.trim() ||
    message.message?.videoMessage?.caption?.trim() ||
    ""
  );
}

function findUsedPrefix(text, prefixSetting) {
  if (!text) return "";
  return getPrefixes(prefixSetting).find((p) => text.startsWith(p)) || "";
}

function parseCommand(text, prefixSetting) {
  const usedPrefix = findUsedPrefix(text, prefixSetting);
  const commandBody = usedPrefix
    ? text.slice(usedPrefix.length).trim()
    : text.trim();
  const parts = commandBody.split(/\s+/).filter(Boolean);
  const commandName = (parts[0] || "").toLowerCase();
  const args = parts.slice(1);
  const argsText = commandBody.slice(parts[0]?.length || 0).trim();

  return { usedPrefix, commandBody, commandName, args, argsText };
}

function formatCommand(commandName, prefixSetting) {
  return `${getPrimaryPrefix(prefixSetting)}${commandName}`;
}

module.exports = {
  DEFAULT_PREFIX,
  getPrefixSetting,
  getPrefixes,
  getPrimaryPrefix,
  getMessageText,
  findUsedPrefix,
  parseCommand,
  formatCommand,
};
