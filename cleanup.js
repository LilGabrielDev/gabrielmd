const fs = require("fs");
const path = require("path");

const dirsToClean = [
  path.join(__dirname, "temp"),
  path.join(__dirname, "tmp"),
];

for (const dir of dirsToClean) {
  if (fs.existsSync(dir)) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        try {
          fs.rmSync(path.join(dir, file), { recursive: true, force: true });
        } catch {}
      }
      console.log(`🧹 Cleaned ${path.basename(dir)} directory`);
    } catch (err) {
      console.error(`Error cleaning ${dir}:`, err.message);
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}
console.log("✅ Cleanup complete.");
