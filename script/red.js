const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "red",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Fetch a random video from the API",
  commandCategory: "media",
  usages: "red",
  cooldowns: 5
};

// Your API key
const API_KEY = "f4d88af66e3d36f9117ae53243248bd5";

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  try {
    const waiting = await api.sendMessage("🎬 Fetching a random video... please wait.", threadID, messageID);

    // Fetch from API with API key
    const res = await axios.get(`https://deku-api.giize.com/prn/home?apikey=${API_KEY}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = res.data;
    console.log("API Response:", JSON.stringify(data, null, 2).substring(0, 500));

    // Check different response structures
    let videos = [];
    
    if (data && Array.isArray(data)) {
      videos = data;
    } else if (data && data.data && Array.isArray(data.data)) {
      videos = data.data;
    } else if (data && data.results && Array.isArray(data.results)) {
      videos = data.results;
    } else if (data && data.videos && Array.isArray(data.videos)) {
      videos = data.videos;
    } else if (data && typeof data === 'object') {
      // If it's an object with numeric keys (like {0: {...}, 1: {...}})
      const keys = Object.keys(data).filter(k => !isNaN(k) || k === 'result');
      if (keys.length > 0) {
        if (keys.includes('result') && data.result) {
          videos = [data.result];
        } else {
          videos = keys.map(k => data[k]);
        }
      }
    }

    if (videos.length === 0) {
      api.unsendMessage(waiting.messageID);
      return api.sendMessage("❌ No videos found in response.", threadID, messageID);
    }

    // Get random video
    const randomVideo = videos[Math.floor(Math.random() * videos.length)];
    
    // Find video URL in different possible fields
    let videoUrl = randomVideo.video || randomVideo.videoUrl || randomVideo.video_url || 
                   randomVideo.url || randomVideo.link || randomVideo.mp4;
    
    let thumbnailUrl = randomVideo.thumbnail || randomVideo.thumb || randomVideo.image || 
                       randomVideo.preview || randomVideo.poster;

    const title = randomVideo.title || randomVideo.name || randomVideo.caption || "No title";
    const duration = randomVideo.duration || randomVideo.length || "Unknown";
    const uploader = randomVideo.uploader || randomVideo.author || randomVideo.channel || "Unknown";

    if (!videoUrl) {
      api.unsendMessage(waiting.messageID);
      console.log("Full video object:", randomVideo);
      return api.sendMessage("❌ Video URL not found in response.", threadID, messageID);
    }

    // Ensure video URL is properly formatted
    if (!videoUrl.startsWith('http')) {
      videoUrl = 'https://' + videoUrl;
    }

    api.editMessage(`📥 Downloading: ${title}...`, waiting.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "red");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download video
    const videoPath = path.join(cacheDir, `red_${Date.now()}.mp4`);
    
    try {
      const videoResp = await axios.get(videoUrl, { 
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
        }
      });

      fs.writeFileSync(videoPath, videoResp.data);
      
      const fileSizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);

      // Download thumbnail if available (optional)
      let thumbPath = null;
      if (thumbnailUrl) {
        try {
          thumbPath = path.join(cacheDir, `thumb_${Date.now()}.jpg`);
          const thumbResp = await axios.get(thumbnailUrl, { 
            responseType: "arraybuffer",
            timeout: 10000
          });
          fs.writeFileSync(thumbPath, thumbResp.data);
        } catch (thumbErr) {
          console.log("Thumbnail download failed:", thumbErr.message);
        }
      }

      api.unsendMessage(waiting.messageID);

      // Prepare message body
      const messageBody = `🎬 **RANDOM VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                         `**Title:** ${title}\n` +
                         `**Duration:** ${duration}\n` +
                         `**Uploader:** ${uploader}\n` +
                         `**Size:** ${fileSizeMB} MB\n` +
                         `━━━━━━━━━━━━━━━━`;

      // Send video (with thumbnail if available)
      if (thumbPath && fs.existsSync(thumbPath)) {
        api.sendMessage(
          {
            body: messageBody,
            attachment: [
              fs.createReadStream(thumbPath),
              fs.createReadStream(videoPath)
            ]
          },
          threadID,
          () => {
            // Clean up files
            try { fs.unlinkSync(videoPath); } catch (e) {}
            try { if (thumbPath) fs.unlinkSync(thumbPath); } catch (e) {}
          },
          messageID
        );
      } else {
        api.sendMessage(
          {
            body: messageBody,
            attachment: fs.createReadStream(videoPath)
          },
          threadID,
          () => {
            try { fs.unlinkSync(videoPath); } catch (e) {}
          },
          messageID
        );
      }

    } catch (downloadErr) {
      console.error("Download error:", downloadErr);
      api.editMessage("❌ Download failed. The video might be unavailable.", waiting.messageID);
    }

  } catch (err) {
    console.error("Red Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
