const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "tikstalk",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Stalk TikTok profiles via username",
  commandCategory: "social",
  usages: "tikstalk <username>",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const username = args.join(" ").trim();

  if (!username) {
    return api.sendMessage(
      "❌ Please provide a TikTok username.\n\nExample: tikstalk zeiki",
      threadID,
      messageID
    );
  }

  try {
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    const waiting = await api.sendMessage(`🔍 Stalking TikTok user: ${username}...`, threadID, messageID);

    // Fetch TikTok profile data
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/tikstalk?username=${encodeURIComponent(username)}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;

    // Check if user exists
    if (!data || !data.id) {
      api.unsendMessage(waiting.messageID);
      return api.sendMessage(`❌ TikTok user "${username}" not found.`, threadID, messageID);
    }

    // Format numbers with commas
    const formatNumber = (num) => {
      return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
    };

    // Prepare profile information
    const profileInfo = 
      `📱 **TIKTOK PROFILE STALK**\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `**Username:** @${data.username || username}\n` +
      `**Nickname:** ${data.nickname || 'N/A'}\n` +
      `**User ID:** ${data.id || 'N/A'}\n` +
      `**Bio:** ${data.signature || 'No bio'}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📊 **STATISTICS**\n` +
      `• **Followers:** ${formatNumber(data.followerCount)}\n` +
      `• **Following:** ${formatNumber(data.followingCount)}\n` +
      `• **Videos:** ${formatNumber(data.videoCount)}\n` +
      `• **Likes:** ${formatNumber(data.heartCount)}\n` +
      `• **Diggs:** ${formatNumber(data.diggCount)}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🔗 **Profile:** https://tiktok.com/@${data.username || username}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `💬 Requested by: ${senderName}`;

    // Download avatar if available
    let attachment = null;
    if (data.avatarLarger) {
      try {
        const avatarPath = path.join(__dirname, "cache", `tiktok_${Date.now()}.jpg`);
        const avatarRes = await axios.get(data.avatarLarger, {
          responseType: "arraybuffer",
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.tiktok.com/'
          }
        });
        fs.writeFileSync(avatarPath, avatarRes.data);
        attachment = fs.createReadStream(avatarPath);
        
        // Schedule avatar deletion
        setTimeout(() => {
          try { fs.unlinkSync(avatarPath); } catch (e) {}
        }, 60000);
      } catch (avatarErr) {
        console.error("Avatar download error:", avatarErr.message);
      }
    }

    // Delete waiting message
    api.unsendMessage(waiting.messageID);

    // Send profile info with avatar
    api.sendMessage(
      {
        body: profileInfo,
        attachment: attachment
      },
      threadID,
      messageID
    );

  } catch (err) {
    console.error("TikStalk Error:", err);
    
    let errorMessage = "❌ Failed to fetch TikTok profile.";
    if (err.response) {
      if (err.response.status === 404) {
        errorMessage = `❌ TikTok user "${username}" not found.`;
      } else {
        errorMessage = `❌ API Error: ${err.response.status}`;
      }
    } else if (err.message.includes("timeout")) {
      errorMessage = "❌ Request timeout. Please try again.";
    }
    
    api.sendMessage(errorMessage, threadID, messageID);
  }
};
