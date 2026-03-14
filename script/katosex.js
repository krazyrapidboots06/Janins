const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "katorsex",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Get videos from Katorsex API",
  commandCategory: "video",
  usages: "/katorsex [page number] or /katorsex [search]",
  cooldowns: 3
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  let page = 1;
  let searchQuery = "";

  // Check if first argument is a number (page)
  if (args.length > 0 && !isNaN(args[0])) {
    page = parseInt(args[0]);
    searchQuery = args.slice(1).join(" ");
  } else {
    searchQuery = args.join(" ");
  }

  try {
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} requested katorsex videos (page ${page})`);

    // Fetch videos from API
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/katorsex?page=${page}`;
    
    const waiting = await api.sendMessage(`📹 Fetching videos from page ${page}...`, threadID, messageID);
    
    const response = await axios.get(apiUrl);
    
    if (!response.data || !response.data.results || response.data.results.length === 0) {
      return api.editMessage("❌ No videos found on this page.", waiting.messageID);
    }

    let videos = response.data.results;
    
    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      videos = videos.filter(video => 
        video.title.toLowerCase().includes(query)
      );
      
      if (videos.length === 0) {
        return api.editMessage(`❌ No videos found matching "${searchQuery}".`, waiting.messageID);
      }
    }

    // Create a numbered list of videos
    let listMessage = `📋 **KATORSEX VIDEOS** (Page ${page})\n━━━━━━━━━━━━━━━━\n`;
    listMessage += `Found: ${videos.length} videos\n\n`;
    
    videos.slice(0, 10).forEach((video, index) => {
      listMessage += `${index + 1}. **${video.title}**\n`;
      listMessage += `   📎 [Download Link](${video.downloadUrl})\n\n`;
    });
    
    listMessage += `━━━━━━━━━━━━━━━━\n`;
    listMessage += `Reply with the number (1-${Math.min(10, videos.length)}) to download the video.`;
    
    // Delete waiting message
    api.unsendMessage(waiting.messageID);
    
    // Send list and store in memory for reply handling
    api.sendMessage(listMessage, threadID, (err, info) => {
      if (err) return console.error(err);
      
      // Store videos in memory for this thread with the message ID
      if (!memory[threadID].videoLists) memory[threadID].videoLists = {};
      memory[threadID].videoLists[info.messageID] = {
        videos: videos,
        page: page,
        expires: Date.now() + 300000 // 5 minutes expiry
      };
    }, messageID);

  } catch (err) {
    console.error("Katorsex Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

// Handle replies to download selected video
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  
  try {
    // Get stored videos
    if (!memory[threadID] || !memory[threadID].videoLists) {
      return api.sendMessage("❌ Video list expired. Please search again.", threadID, messageID);
    }

    const choice = parseInt(body);
    const videoData = memory[threadID].videoLists[handleReply.messageID];
    
    if (!videoData) {
      return api.sendMessage("❌ This video list has expired. Please search again.", threadID, messageID);
    }

    if (isNaN(choice) || choice < 1 || choice > videoData.videos.length) {
      return api.sendMessage(`❌ Please reply with a valid number between 1 and ${videoData.videos.length}.`, threadID, messageID);
    }

    const selectedVideo = videoData.videos[choice - 1];
    
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    const downloading = await api.sendMessage(`⏳ Downloading: ${selectedVideo.title}...`, threadID, messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "katorsex");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download the video
    const videoPath = path.join(cacheDir, `katorsex_${Date.now()}.mp4`);
    
    const videoResponse = await axios.get(selectedVideo.videoUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://katorsex.me/'
      }
    });

    fs.writeFileSync(videoPath, videoResponse.data);
    
    // Get file size
    const stats = fs.statSync(videoPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    // Delete downloading message
    api.unsendMessage(downloading.messageID);

    // Send the video
    api.sendMessage(
      {
        body: `🎬 **KATORSEX VIDEO**\n━━━━━━━━━━━━━━━━\n` +
              `**Title:** ${selectedVideo.title}\n` +
              `**Size:** ${fileSizeMB} MB\n` +
              `**Page:** ${videoData.page}\n` +
              `━━━━━━━━━━━━━━━━\n` +
              `💬 Requested by: ${senderName}`,
        attachment: fs.createReadStream(videoPath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending video:", err);
        // Clean up file after 5 minutes
        setTimeout(() => {
          try {
            if (fs.existsSync(videoPath)) {
              fs.unlinkSync(videoPath);
            }
          } catch (e) {}
        }, 300000);
      },
      messageID
    );

    // Store in memory
    if (!memory[threadID].videos) memory[threadID].videos = [];
    memory[threadID].videos.push({
      user: senderName,
      title: selectedVideo.title,
      time: Date.now()
    });

  } catch (err) {
    console.error("Katorsex Reply Error:", err);
    api.sendMessage(`❌ Download failed: ${err.message}`, threadID, messageID);
  }
};
