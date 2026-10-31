const fs = require("fs");
const path = require("path");

const sessionDir = path.join(__dirname, "session");
if (fs.existsSync(sessionDir)) {
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    fs.mkdirSync(sessionDir, { recursive: true });
    console.log("🧹 Session folder reset successfully.");
  } catch (err) {
    console.error("Error resetting session:", err.message);
  }
} else {
  fs.mkdirSync(sessionDir, { recursive: true });
  console.log("📁 Session directory created.");
}
console.log("✅ Session reset complete.");
