const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "welcome",
  version: "2.0.0",
  role: 0,
  credits: "selov",
  description: "Sends welcome image when new members join",
  commandCategory: "events",
  cooldowns: 0,
  eventType: ["log:subscribe"]
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, logMessageData } = event;
  const addedParticipants = logMessageData.addedParticipants || [];
  
  for (const user of addedParticipants) {
    const userID = user.userFbId;
    let userName = user.fullName || "New Member";
    
    // Don't send welcome for bot itself
    if (userID === api.getCurrentUserID()) continue;
    
    try {
      // Get group info
      const groupInfo = await api.getThreadInfo(threadID);
      const groupName = groupInfo.threadName || "the group";
      const memberCount = groupInfo.participantIDs.length;
      
      // Truncate long names
      const maxLength = 20;
      if (userName.length > maxLength) {
        userName = userName.substring(0, maxLength - 3) + '...';
      }
      
      // Get user's profile picture URL
      const avatarUrl = `https://graph.facebook.com/${userID}/picture?width=500&height=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      
      // Welcome image API with member's profile picture
      // Using a welcome image generator API that puts the profile picture in a square frame
      const welcomeApiUrl = `https://ace-rest-api.onrender.com/api/welcome?username=${encodeURIComponent(userName)}&avatarUrl=${encodeURIComponent(avatarUrl)}&uid=${userID}&groupname=${encodeURIComponent(groupName)}&memberCount=${memberCount}`;
      
      // Download the welcome image
      const response = await axios.get(welcomeApiUrl, {
        responseType: 'arraybuffer',
        timeout: 15000
      });
      
      // Create cache directory
      const cacheDir = path.join(__dirname, 'cache', 'welcome');
      await fs.ensureDir(cacheDir);
      
      const filePath = path.join(cacheDir, `welcome_${userID}_${Date.now()}.jpg`);
      fs.writeFileSync(filePath, Buffer.from(response.data));
      
      // Send welcome message with image
      const welcomeMsg = `🎉 **WELCOME!** 🎉\n━━━━━━━━━━━━━━━━\n👤 **${userName}**\n📊 **Member #${memberCount}**\n📌 **Group:** ${groupName}\n━━━━━━━━━━━━━━━━\nPlease read the rules and enjoy your stay! 🎈`;
      
      await api.sendMessage({
        body: welcomeMsg,
        attachment: fs.createReadStream(filePath)
      }, threadID);
      
      // Clean up file after sending
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {}
      }, 10000);
      
    } catch (err) {
      console.error("Welcome error:", err.message);
      
      // Fallback: Send text-only welcome if image fails
      const fallbackMsg = `🎉 Welcome to the group, ${userName}! 🎉\nPlease read the rules and enjoy your stay!`;
      await api.sendMessage(fallbackMsg, threadID);
    }
  }
};
