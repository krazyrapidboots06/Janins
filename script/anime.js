const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "anime",
  version: "1.0.0",
  role: 0,
  credits: "selov",
  description: "Get random anime images",
  usages: "anime <category>",
  cooldown: 2,
  hasPrefix: true,
};

// Available categories
const categories = {
  'waifu': 'waifu',
  'neko': 'neko',
  'shinobu': 'shinobu',
  'megumin': 'megumin',
  'bully': 'bully',
  'cuddle': 'cuddle',
  'cry': 'cry',
  'hug': 'hug',
  'awoo': 'awoo',
  'kiss': 'kiss',
  'lick': 'lick',
  'pat': 'pat',
  'smug': 'smug',
  'bonk': 'bonk',
  'yeet': 'yeet',
  'blush': 'blush',
  'smile': 'smile',
  'wave': 'wave',
  'highfive': 'highfive',
  'handhold': 'handhold',
  'nom': 'nom',
  'bite': 'bite',
  'glomp': 'glomp',
  'slap': 'slap',
  'kill': 'kill',
  'kick': 'kick',
  'happy': 'happy',
  'wink': 'wink',
  'poke': 'poke',
  'dance': 'dance',
  'cringe': 'cringe'
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;
  
  // Set reaction
  api.setMessageReaction("⏳", messageID, (err) => {}, true);
  
  try {
    // Get category from args
    let category = args[0] ? args[0].toLowerCase() : 'waifu';
    
    // Check if category exists
    if (!categories[category]) {
      const availableCats = Object.keys(categories).join(', ');
      return api.sendMessage(
        `❌ Invalid category.\n\nAvailable categories:\n${availableCats}`,
        threadID,
        messageID
      );
    }

    // Send typing indicator
    api.sendTypingIndicator(threadID, true);

    // Fetch from Waifu.im API
    const apiUrl = `https://api.waifu.im/search?included_tags=${categories[category]}`;
    const response = await axios.get(apiUrl);
    
    if (!response.data || !response.data.images || response.data.images.length === 0) {
      return api.sendMessage("❌ No image found.", threadID, messageID);
    }

    const imageData = response.data.images[0];
    const imageUrl = imageData.url;

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download image
    const imagePath = path.join(cacheDir, `anime_${Date.now()}.jpg`);
    const imageRes = await axios.get(imageUrl, { 
      responseType: "arraybuffer",
      timeout: 15000
    });

    fs.writeFileSync(imagePath, imageRes.data);

    // Get file size
    const stats = fs.statSync(imagePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    // Get user info
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Prepare message
    const message = `🎨 ANIME ${category.toUpperCase()}\n━━━━━━━━━━━━━━━━\n` +
                    `🏷️ Category: ${category}\n` +
                    `🔗 Source: ${imageData.source || 'Unknown'}\n` +
                    `📦 Size: ${fileSizeKB} KB\n` +
                    `━━━━━━━━━━━━━━━━\n` +
                    `💬 Requested by: ${senderName}`;

    // Send image
    api.setMessageReaction("✅", messageID, (err) => {}, true);
    
    api.sendMessage(
      {
        body: message,
        attachment: fs.createReadStream(imagePath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending image:", err);
        // Clean up
        try {
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (e) {}
      },
      messageID
    );

  } catch (err) {
    console.error("Anime Command Error:", err);
    api.setMessageReaction("❌", messageID, (err) => {}, true);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
