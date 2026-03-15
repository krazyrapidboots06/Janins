const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports.config = {
  name: "porn",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Send random video from database",
  commandCategory: "video",
  usages: "/porn",
  cooldowns: 2
};

// Path to your videos.json file
const jsonPath = path.join(__dirname, "videos.json");

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  try {
    // Check if videos.json exists
    if (!fs.existsSync(jsonPath)) {
      return api.sendMessage("❌ videos.json not found in script folder.", threadID, messageID);
    }

    // Read and parse JSON file
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const videos = JSON.parse(jsonData);

    if (!videos || videos.length === 0) {
      return api.sendMessage("❌ No videos in database.", threadID, messageID);
    }

    // Get user name for logging
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Get random video
    const randomIndex = Math.floor(Math.random() * videos.length);
    const selectedVideo = videos[randomIndex];

    // Send "downloading" message
    const waiting = await api.sendMessage("⏳ Sending video...", threadID, messageID);

    // Create cache directory for temp files
    const cacheDir = path.join(__dirname, "cache", "porn");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download the video
    const videoPath = path.join(cacheDir, `porn_${Date.now()}.mp4`);
    
    try {
      const videoResponse = await axios.get(selectedVideo.url, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://pinayflix.top/'
        }
      });

      fs.writeFileSync(videoPath, videoResponse.data);
      
      // Get file size
      const fileSizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);

      // Delete waiting message
      api.unsendMessage(waiting.messageID);

      // Send the video with info
      api.sendMessage(
        {
          body: `🎬 **RANDOM VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                `**Title:** ${selectedVideo.title || 'Untitled'}\n` +
                `**Duration:** ${selectedVideo.duration || 'Unknown'}\n` +
                `**Source:** ${selectedVideo.source || 'Unknown'}\n` +
                `**Size:** ${fileSizeMB} MB\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `💬 Requested by: ${senderName}`,
          attachment: fs.createReadStream(videoPath)
        },
        threadID,
        (err) => {
          if (err) console.error("Send error:", err);
          // Delete file after 1 minute
          setTimeout(() => {
            try { fs.unlinkSync(videoPath); } catch (e) {}
          }, 60000);
        },
        messageID
      );

    } catch (downloadErr) {
      console.error("Download error:", downloadErr);
      api.unsendMessage(waiting.messageID);
      api.sendMessage("❌ Failed to download video.", threadID, messageID);
    }

  } catch (err) {
    console.error("Porn Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
