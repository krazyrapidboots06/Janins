const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "katorsex",
  version: "7.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Get random video",
  commandCategory: "video",
  usages: "/katorsex",
  cooldowns: 5
};

// Admin UIDs only
const ADMIN_UIDS = ["61556388598622", "61552057602849"];

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // Check if user is admin
  if (!ADMIN_UIDS.includes(senderID.toString())) {
    return;
  }

  try {
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "Admin";

    const waiting = await api.sendMessage("🔍 Accessing video source...", threadID, messageID);

    const apiUrl = "https://betadash-api-swordslush-production.up.railway.app/katorsex?page=1";
    
    api.editMessage("📡 Connecting to video server...", waiting.messageID);
    
    const response = await axios.get(apiUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    let videos = [];
    
    if (response.data && Array.isArray(response.data)) {
      videos = response.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      videos = response.data.results;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      videos = response.data.data;
    } else if (response.data && response.data.videos && Array.isArray(response.data.videos)) {
      videos = response.data.videos;
    }

    if (videos.length === 0) {
      api.editMessage("❌ No videos found.", waiting.messageID);
      return;
    }

    api.editMessage(`✅ Found ${videos.length} videos. Selecting one...`, waiting.messageID);

    const randomIndex = Math.floor(Math.random() * videos.length);
    const selectedVideo = videos[randomIndex];

    let videoUrl = null;
    const possibleFields = [
      'videoUrl', 'downloadUrl', 'url', 'link', 'video', 
      'mp4', 'file', 'src', 'source', 'content', 'path'
    ];

    for (const field of possibleFields) {
      if (selectedVideo[field]) {
        videoUrl = selectedVideo[field];
        break;
      }
    }

    if (!videoUrl && selectedVideo.video_info) {
      for (const field of possibleFields) {
        if (selectedVideo.video_info[field]) {
          videoUrl = selectedVideo.video_info[field];
          break;
        }
      }
    }

    if (!videoUrl) {
      api.editMessage("❌ Video URL not found.", waiting.messageID);
      return;
    }

    api.editMessage(`📥 Downloading video...`, waiting.messageID);

    const cacheDir = path.join(__dirname, "cache", "videos");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const videoPath = path.join(cacheDir, `video_${Date.now()}.mp4`);
    
    try {
      const videoResponse = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
        }
      });

      fs.writeFileSync(videoPath, videoResponse.data);
      
      const fileSizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);

      api.unsendMessage(waiting.messageID);

      api.sendMessage(
        {
          body: `🎬 **VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                `📹 ${selectedVideo.title || 'Untitled'}\n` +
                `📦 ${fileSizeMB} MB\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `👤 ${senderName}`,
          attachment: fs.createReadStream(videoPath)
        },
        threadID,
        () => {
          setTimeout(() => {
            try { fs.unlinkSync(videoPath); } catch (e) {}
          }, 60000);
        },
        messageID
      );

    } catch (downloadErr) {
      api.editMessage(`❌ Download failed.`, waiting.messageID);
    }

  } catch (err) {
    console.log(err);
  }
};
