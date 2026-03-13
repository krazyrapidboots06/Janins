const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "onlytik",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Get random TikTok videos",
  commandCategory: "media",
  usages: "onlytik (random) or onlytik <count>",
  cooldowns: 3
};

const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let count = 1;

  try {
    // Check if user specified count (e.g., onlytik 3)
    if (args[0] && !isNaN(args[0])) {
      count = parseInt(args[0]);
      if (count < 1) count = 1;
      if (count > 5) count = 5; // Limit to 5 videos max
    }

    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} requested ${count} random TikTok video(s)`);

    const searching = await api.sendMessage(`🎲 Fetching ${count} random TikTok video(s)...`, threadID, messageID);

    // Try different possible API formats
    let apiUrl;
    let videos = [];

    // Attempt 1: Random endpoint with count
    apiUrl = `https://haji-mix-api.gleeze.com/api/onlytik?random=true&limit=${count}&stream=true`;
    
    try {
      const res = await axios.get(apiUrl);
      videos = res.data.videos || res.data.data || (Array.isArray(res.data) ? res.data : [res.data]);
    } catch (e) {
      // Attempt 2: Without random parameter
      apiUrl = `https://haji-mix-api.gleeze.com/api/onlytik?limit=${count}&stream=true`;
      const res = await axios.get(apiUrl);
      videos = res.data.videos || res.data.data || (Array.isArray(res.data) ? res.data : [res.data]);
    }

    if (!videos || videos.length === 0) {
      return api.editMessage("❌ No videos available right now.", searching.messageID);
    }

    // Limit to requested count
    videos = videos.slice(0, count);
    
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    let successCount = 0;
    const videoPaths = [];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      
      // Try to find video URL in different possible fields
      const videoUrl = video.videoUrl || video.playUrl || video.downloadUrl || video.url || video.play || video.video;
      
      if (!videoUrl) {
        console.log(`Video ${i+1} has no URL:`, video);
        continue;
      }

      try {
        api.editMessage(`📥 Downloading video ${i+1}/${videos.length}...`, searching.messageID);

        const videoPath = path.join(cacheDir, `onlytik_${Date.now()}_${i}.mp4`);
        const videoRes = await axios.get(videoUrl, { 
          responseType: "arraybuffer",
          timeout: 60000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        fs.writeFileSync(videoPath, videoRes.data);
        videoPaths.push(videoPath);
        successCount++;
      } catch (err) {
        console.error(`Failed to download video ${i+1}:`, err.message);
      }
    }

    if (successCount === 0) {
      return api.editMessage("❌ Failed to download any videos.", searching.messageID);
    }

    // Prepare attachments
    const attachments = videoPaths.map(p => fs.createReadStream(p));

    // Send videos
    api.sendMessage(
      {
        body: `🎵 RANDOM TIKTOK VIDEOS\n━━━━━━━━━━━━━━━━\n` +
              `📹 Requested: ${successCount} video(s)\n` +
              `💬 Requested by: ${senderName}`,
        attachment: attachments
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending videos:", err);
        // Clean up files
        videoPaths.forEach(p => {
          try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
        });
      },
      messageID
    );

    api.editMessage(`✅ Sent ${successCount} video(s)!`, searching.messageID);
    memory[threadID].push(`Downloaded ${successCount} random TikTok videos`);

  } catch (err) {
    console.error("OnlyTik Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
