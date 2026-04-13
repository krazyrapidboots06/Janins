const os = require("os");
const fs = require("fs-extra");
const path = require("path");

// Store bot start time
if (!global.botStartTime) global.botStartTime = Date.now();

function formatDuration(ms) {
  let seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / (3600 * 24));
  seconds %= 3600 * 24;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function createProgressBar(percentage, length = 20) {
  const filled = Math.round((percentage / 100) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports.config = {
  name: "up",
  version: "3.5",
  role: 0,
  credits: "MR᭄﹅ Selov メꪜ",
  description: "Check bot uptime with full system + VPS details",
  commandCategory: "system",
  usages: "/up",
  cooldowns: 5,
  aliases: ["uptime", "status"]
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  try {
    const msg = await api.sendMessage("⚡ Checking Uptime Status...", threadID);

    const steps = [20, 40, 60, 80, 100];
    const delayMs = 1000;

    for (let i = 0; i < steps.length; i++) {
      const percent = steps[i];
      if (percent < 100) {
        const body = `⏳ Loading...\n\n[${createProgressBar(percent)}] ${percent}%`;
        await api.editMessage(body, msg.messageID);
        await sleep(delayMs);
      } else {
        // System stats
        const uptime = formatDuration(Date.now() - global.botStartTime);
        const cpuUsage = os.loadavg()[0]?.toFixed(2) || "0.00";
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        const usedMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const startTime = new Date(global.botStartTime).toLocaleString();
        const hostname = os.hostname();
        
        // Get IP address
        const netInterfaces = os.networkInterfaces();
        let ipAddr = "N/A";
        for (const name of Object.keys(netInterfaces)) {
          for (const net of netInterfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
              ipAddr = net.address;
              break;
            }
          }
        }

        const finalMsg =
`✨ BOT UPTIME ✨
[${createProgressBar(100)}] 100% ✅

⏳ Uptime: ${uptime}
💻 CPU Load: ${cpuUsage}%
📦 **Memory: ${usedMem} / ${totalMem} MB
🖥 **Platform: ${platform}
🚀 Started: ${startTime}
━━━━━━━━━━━━━━━━
📡 Host: ${hostname}
🌐 IP Address: ${ipAddr}
━━━━━━━━━━━━━━━━`;

        await api.editMessage(finalMsg, msg.messageID);
      }
    }
  } catch (err) {
    console.error("Uptime Error:", err);
    api.sendMessage("⚠ Failed to check uptime!", threadID, messageID);
  }
};
