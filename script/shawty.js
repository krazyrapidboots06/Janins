const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "shawty",
  version: "2.0.0",
  role: 0,
  credits: "syntaxt0x1c",
  description: "Generate a random TikTok video",
  usages: "[]",
  cooldown: 0,
  hasPrefix: true
};

module.exports.run = async ({ api, event, args }) => {
  const { messageID, threadID } = event;
  
  // Set initial reaction and typing indicator
  api.setMessageReaction("⏳", messageID, (err) => {}, true);
  api.sendTypingIndicator(threadID, true);

  try {
    // Fetch video details from the API
    const response = await axios.get('https://oreo.gleeze.com/api/shawty?stream=false', {
      timeout: 15000
    });

    const data = response.data;
    
    // Validate API response
    if (!data || !data.shotiurl) {
      api.setMessageReaction("❌", messageID, (err) => {}, true);
      return api.sendMessage("❌ No video found or invalid response from the API.", threadID, messageID);
    }

    // Create cache directory if it doesn't exist
    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    
    // Video file path
    const videoPath = path.join(cacheDir, `shawty_${Date.now()}.mp4`);

    // Download the video using axios (more reliable than request module)
    const downloadResponse = await axios({
      method: 'GET',
      url: data.shotiurl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(videoPath);
    downloadResponse.data.pipe(writer);

    // Wait for download to complete
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Verify file was downloaded
    const stats = fs.statSync(videoPath);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    // Update reaction to success
    api.setMessageReaction("✅", messageID, (err) => {}, true);

    // Prepare video information message
    const infoMessage = 
      `🎬 **TikTok Video**\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `**Title:** ${data.title || 'Untitled'}\n` +
      `**Username:** @${data.username || 'Unknown'}\n` +
      `**Nickname:** ${data.nickname || 'Unknown'}\n` +
      `**Duration:** ${data.duration || '?'} seconds\n` +
      `**Region:** ${data.region || 'Unknown'}\n` +
      `**Total Videos:** ${data.total_vids || 'N/A'}\n` +
      `━━━━━━━━━━━━━━━━`;

    // Send the video with information
    api.sendMessage({
      body: infoMessage,
      attachment: fs.createReadStream(videoPath)
    }, threadID, () => {
      // Clean up file after sending
      fs.unlinkSync(videoPath);
    }, messageID);

  } catch (err) {
    console.error('Shawty command error:', err.message);
    api.setMessageReaction("❌", messageID, (err) => {}, true);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
