const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "pinay",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Get random Pinay videos",
  commandCategory: "video",
  usages: "/pinay",
  cooldowns: 5
};

// Optional: Add admin UIDs if you want to restrict access
// const ADMIN_UIDS = ["61556388598622", "61552057602849"];

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // Optional: Uncomment to restrict to admins only
  // if (!ADMIN_UIDS.includes(senderID.toString())) {
  //   return;
  // }

  try {
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    const waiting = await api.sendMessage("🔍 Fetching random Pinay video...", threadID, messageID);

    // Fetch videos from API
    const apiUrl = "https://betadash-api-swordslush-production.up.railway.app/lootedpinay?page=1";
    
    const response = await axios.get(apiUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    // Get videos array from response
    const videos = response.data.result || [];
    
    if (videos.length === 0) {
      api.editMessage("❌ No videos found.", waiting.messageID);
      return;
    }

    api.editMessage(`✅ Found ${videos.length} videos. Selecting one...`, waiting.messageID);

    // Get random video
    const randomIndex = Math.floor(Math.random() * videos.length);
    const selectedVideo = videos[randomIndex];

    // Get video URL
    const videoUrl = selectedVideo.videoUrl;
    
    if (!videoUrl) {
      api.editMessage("❌ Video URL not found.", waiting.messageID);
      return;
    }

    api.editMessage(`📥 Downloading: ${selectedVideo.title || 'Video'}...`, waiting.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "pinay");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download the video
    const videoPath = path.join(cacheDir, `pinay_${Date.now()}.mp4`);
    
    try {
      const videoResponse = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
          'Referer': 'https://pinayflix.top/'
        }
      });

      fs.writeFileSync(videoPath, videoResponse.data);
      
      const fileSizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);

      api.unsendMessage(waiting.messageID);

      // Send the video
      api.sendMessage(
        {
          body: `🎬 **PINAY VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                `**Title:** ${selectedVideo.title || 'Untitled'}\n` +
                `**Size:** ${fileSizeMB} MB\n` +
                `**Video #:** ${randomIndex + 1}/${videos.length}\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `💬 Requested by: ${senderName}`,
          attachment: fs.createReadStream(videoPath)
        },
        threadID,
        (err) => {
          if (err) console.error("Send error:", err);
          setTimeout(() => {
            try { fs.unlinkSync(videoPath); } catch (e) {}
          }, 60000);
        },
        messageID
      );

    } catch (downloadErr) {
      console.error("Download error:", downloadErr);
      api.editMessage(`❌ Download failed.`, waiting.messageID);
    }

  } catch (err) {
    console.error("Pinay Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
