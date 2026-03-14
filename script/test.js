const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "test",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Send videos in sequence from JSON database",
  commandCategory: "test",
  usages: "/test",
  cooldowns: 2
};

// Path to videos.json in script folder
const jsonPath = path.join(__dirname, "videos.json");

// Path to store the current index
const indexPath = path.join(__dirname, "cache", "video_index.txt");

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  try {
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Check if JSON file exists
    if (!fs.existsSync(jsonPath)) {
      return api.sendMessage(
        `❌ videos.json not found at: ${jsonPath}\n\n` +
        `Please create the file in your script folder.`,
        threadID,
        messageID
      );
    }

    // Read and parse JSON file
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const videos = JSON.parse(jsonData);

    if (!videos || videos.length === 0) {
      return api.sendMessage("❌ No videos found in database.", threadID, messageID);
    }

    // Create cache directory if it doesn't exist
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Read current index or start at 0
    let currentIndex = 0;
    if (fs.existsSync(indexPath)) {
      currentIndex = parseInt(fs.readFileSync(indexPath, 'utf8')) || 0;
    }

    // Get the current video based on index
    const selectedVideo = videos[currentIndex];
    
    // Calculate next index (loop back to 0 if at the end)
    const nextIndex = (currentIndex + 1) % videos.length;
    
    // Save the next index for future use
    fs.writeFileSync(indexPath, nextIndex.toString());

    api.sendTypingIndicator(threadID, true);
    const waiting = await api.sendMessage(
      `🎬 Sending video ${currentIndex + 1}/${videos.length}...`, 
      threadID, 
      messageID
    );

    // Download the video
    const tempDir = path.join(cacheDir, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoPath = path.join(tempDir, `test_${Date.now()}.mp4`);
    
    const videoRes = await axios.get(selectedVideo.url, { 
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    fs.writeFileSync(videoPath, videoRes.data);
    const stats = fs.statSync(videoPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    api.unsendMessage(waiting.messageID);

    // Send the video with queue info
    api.sendMessage(
      {
        body: `🎬 **VIDEO QUEUE**\n━━━━━━━━━━━━━━━━\n` +
              `**Title:** ${selectedVideo.title || 'Untitled'}\n` +
              `**Duration:** ${selectedVideo.duration || 'Unknown'}\n` +
              `**Source:** ${selectedVideo.source || 'Unknown'}\n` +
              `**Size:** ${fileSizeMB} MB\n` +
              `━━━━━━━━━━━━━━━━\n` +
              `**Progress:** ${currentIndex + 1}/${videos.length}\n` +
              `**Next:** ${nextIndex + 1}. ${videos[nextIndex].title}\n` +
              `━━━━━━━━━━━━━━━━\n` +
              `💬 Requested by: ${senderName}`,
        attachment: fs.createReadStream(videoPath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending video:", err);
        // Clean up
        try {
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
        } catch (e) {}
      },
      messageID
    );

  } catch (err) {
    console.error("Test Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
