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

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  try {
    const waiting = await api.sendMessage("🎬 Fetching a random video... please wait.", threadID, messageID);

    // Fetch videos from API
    const response = await axios.get("https://betadash-api-swordslush-production.up.railway.app/sulasok?page=1", {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;
    console.log("API Response:", JSON.stringify(data, null, 2).substring(0, 500)); // Debug log

    // Try different possible response structures
    let videos = [];
    
    if (data && Array.isArray(data)) {
      videos = data;
    } else if (data && data.results && Array.isArray(data.results)) {
      videos = data.results;
    } else if (data && data.data && Array.isArray(data.data)) {
      videos = data.data;
    } else if (data && data.videos && Array.isArray(data.videos)) {
      videos = data.videos;
    } else if (data && typeof data === 'object') {
      // If it's an object with numbered keys (like {0: {...}, 1: {...}})
      const possibleVideos = Object.values(data).filter(val => val && typeof val === 'object');
      if (possibleVideos.length > 0) {
        videos = possibleVideos;
      }
    }

    if (videos.length === 0) {
      api.unsendMessage(waiting.messageID);
      return api.sendMessage("❌ No videos found in response.", threadID, messageID);
    }

    // Get random video
    const randomIndex = Math.floor(Math.random() * videos.length);
    const videoInfo = videos[randomIndex];
    
    console.log("Selected video:", JSON.stringify(videoInfo, null, 2)); // Debug log

    // Try all possible video URL fields
    const possibleUrlFields = [
      'videoUrl', 'video', 'url', 'link', 'mp4', 
      'downloadUrl', 'download', 'src', 'source',
      'file', 'content', 'path', 'play', 'playUrl'
    ];
    
    let videoUrl = null;
    for (const field of possibleUrlFields) {
      if (videoInfo[field]) {
        videoUrl = videoInfo[field];
        console.log(`Found URL in field: ${field}`);
        break;
      }
    }

    // Check nested objects
    if (!videoUrl && videoInfo.video_info) {
      for (const field of possibleUrlFields) {
        if (videoInfo.video_info[field]) {
          videoUrl = videoInfo.video_info[field];
          console.log(`Found URL in video_info.${field}`);
          break;
        }
      }
    }

    if (!videoUrl) {
      api.unsendMessage(waiting.messageID);
      console.log("Full video object for debugging:", JSON.stringify(videoInfo, null, 2));
      return api.sendMessage("❌ Video URL not found in API response.", threadID, messageID);
    }

    // Extract other info with fallbacks
    const title = videoInfo.title || videoInfo.name || videoInfo.caption || "Untitled";
    const duration = videoInfo.duration || videoInfo.length || "Unknown";
    const views = videoInfo.views || videoInfo.view_count || videoInfo.play_count || "N/A";
    const uploader = videoInfo.uploader || videoInfo.author || videoInfo.channel || videoInfo.username || "Unknown";

    // Update waiting message
    api.editMessage(`📥 Downloading: ${title.substring(0, 50)}...`, waiting.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "red");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download video
    const videoPath = path.join(cacheDir, `red_${Date.now()}.mp4`);
    
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
      
      // Check if file was downloaded properly
      if (fs.statSync(videoPath).size === 0) {
        throw new Error("Downloaded file is empty");
      }

      const fileSizeMB = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);

      // Delete waiting message
      api.unsendMessage(waiting.messageID);

      // Send video with info
      api.sendMessage(
        {
          body: `🎬 **RANDOM VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                `**Title:** ${title}\n` +
                `**Duration:** ${duration}\n` +
                `**Views:** ${views}\n` +
                `**Uploader:** ${uploader}\n` +
                `**Size:** ${fileSizeMB} MB\n` +
                `━━━━━━━━━━━━━━━━`,
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
      api.unsendMessage(waiting.messageID);
      api.sendMessage(`❌ Download failed: ${downloadErr.message}`, threadID, messageID);
    }

  } catch (err) {
    console.error("Red Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
