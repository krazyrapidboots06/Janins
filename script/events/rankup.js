const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "rankup",
  version: "5.0.0",
  role: 0,
  credits: "selov",
  description: "Auto rankup notification with GIF when user levels up",
  commandCategory: "events",
  cooldowns: 0,
  eventType: ["message"]
};

// Store rankup settings per thread
if (!global.rankupSettings) global.rankupSettings = {};

// XP System (simple)
const XP_PER_MESSAGE = 1;
const XP_COOLDOWN = 30000; // 30 seconds
const DELTA_NEXT = 5;

// XP to Level calculation
function expToLevel(exp) {
  return Math.floor((1 + Math.sqrt(1 + (8 * exp) / DELTA_NEXT)) / 2);
}

// Initialize user XP data
if (!global.userXP) global.userXP = {};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, isGroup, body } = event;
  
  // Only work in groups
  if (!isGroup) return;
  
  // Initialize thread settings if not exists (enabled by default)
  if (!global.rankupSettings[threadID]) {
    global.rankupSettings[threadID] = {
      enabled: true
    };
  }
  
  // Check if rankup is enabled for this thread
  if (!global.rankupSettings[threadID].enabled) return;
  
  // Initialize user XP if not exists
  if (!global.userXP[senderID]) {
    global.userXP[senderID] = {
      xp: 0,
      level: 1,
      lastMessage: 0
    };
  }
  
  const userData = global.userXP[senderID];
  const now = Date.now();
  
  // XP Cooldown check
  if (now - userData.lastMessage < XP_COOLDOWN) return;
  
  // Update last message time
  userData.lastMessage = now;
  
  // Add XP
  const oldExp = userData.xp;
  const newExp = oldExp + XP_PER_MESSAGE;
  userData.xp = newExp;
  
  // Calculate levels
  const oldLevel = expToLevel(oldExp);
  const newLevel = expToLevel(newExp);
  
  // Check if leveled up
  if (newLevel > oldLevel && newLevel > 1) {
    userData.level = newLevel;
    
    // Get user info
    let userName = "Member";
    try {
      const userInfo = await api.getUserInfo(senderID);
      userName = userInfo[senderID]?.name || "Member";
    } catch (e) {}
    
    // Try to get rankup GIF from API
    try {
      const cacheDir = path.join(__dirname, 'cache', 'rankup');
      await fs.ensureDir(cacheDir);
      const imagePath = path.join(cacheDir, `rankup_${senderID}_${Date.now()}.gif`);
      
      const response = await axios({
        method: "get",
        url: `https://rankup-api-b1rv.vercel.app/api/rankup?uid=${senderID}&name=${encodeURIComponent(userName)}&level=${newLevel}`,
        responseType: "stream",
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      const writer = fs.createWriteStream(imagePath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      
      // Send ONLY the GIF (no text message)
      await api.sendMessage({
        attachment: fs.createReadStream(imagePath)
      }, threadID);
      
      // Clean up
      setTimeout(() => {
        try { fs.unlinkSync(imagePath); } catch (e) {}
      }, 10000);
      
    } catch (gifErr) {
      console.error("[RANKUP] GIF error:", gifErr.message);
      // Silent fail - no message if GIF fails
    }
  }
};
