const settings = require("../settings");

function getStr(key) {
  if (key === "botName") return settings.botName || "Gabriel MD Bot";
  if (key === "pic1") return settings.pic1 || "https://files.catbox.moe/5uli5p.jpeg";
  return settings[key] || "";
}

function fmt(text) {
  return text;
}

module.exports = { getStr, fmt };
