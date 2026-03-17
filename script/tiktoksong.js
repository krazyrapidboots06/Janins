const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_URL = 'https://free-goat-api.onrender.com/tiktok/video?search=';

module.exports.config = {
  name: "tiktoksong",
  version: "1.0.0",
  role: 0,
  hasPrefix: true,
  aliases: ['ttsong', 'tiktokmusic'],
  usage: 'tiktoksong [song name]',
  description: 'Search and download music from TikTok videos',
  credits: 'Selov',
  cooldown: 10
};

module.exports.run = async function ({ api, event, args }) {
  const query = args.join(' ').trim();
  
  if (!query) {
    return api.sendMessage(
      `🎵 **Usage:** tiktoksong <song name>\n` +
      `📱 **Example:** tiktoksong umaasa`,
      event.threadID,
      event.messageID
    );
  }

  const searchingMsg = await api.sendMessage(`🔍 Searching TikTok for "${query}"...`, event.threadID);

  try {
    // Search for videos
    const searchRes = await axios.get(`${API_URL}${encodeURIComponent(query)}`, {
      timeout: 15000
    });

    // Check if the API returned results
    if (!searchRes.data?.data?.videos || searchRes.data.data.videos.length === 0) {
      return api.editMessage(`❌ No results found for "${query}".`, searchingMsg.messageID);
    }

    // Get the first video result
    const video = searchRes.data.data.videos[0];
    
    // Extract music information
    const musicInfo = video.music_info || {};
    const musicTitle = musicInfo.title || video.title || "Unknown Title";
    const musicAuthor = musicInfo.author || "Unknown Artist";
    const musicUrl = video.music || musicInfo.play;
    
    // If there's no music URL, check if it's in the music_info
    if (!musicUrl) {
      return api.editMessage(`❌ No music found for this video.`, searchingMsg.messageID);
    }

    await api.editMessage(`⬇️ Downloading: ${musicTitle}...`, searchingMsg.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, 'cache', 'tiktok');
    await fs.ensureDir(cacheDir);
    
    const filePath = path.join(cacheDir, `ttsong_${Date.now()}.mp3`);
    
    // Download the MP3 file
    const downloadStream = await axios({
      method: 'GET',
      url: musicUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(filePath);
    downloadStream.data.pipe(writer);

    // Wait for download to complete
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Check file size (max 25MB)
    const stats = fs.statSync(filePath);
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(filePath);
      return api.editMessage(`⚠️ File too large (max 25MB).`, searchingMsg.messageID);
    }

    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    // Get additional video info for context
    const videoAuthor = video.author?.nickname || "Unknown";
    const videoDesc = video.content_desc?.[0] || video.title || "";
    const videoDuration = video.duration || 0;
    const durationStr = formatDuration(videoDuration);
    const playCount = formatNumber(video.play_count || 0);

    // Delete searching message
    await api.unsendMessage(searchingMsg.messageID);

    // Send ONLY the MP3 file
    api.sendMessage({
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      // Clean up file after sending
      fs.unlinkSync(filePath);
    }, event.messageID);

    // Optional: Send a separate message with info (comment out if you want audio only)
    // Uncomment the lines below if you want to show song info
    /*
    api.sendMessage(
      `🎵 **TikTok Song Downloaded**\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🎧 **Title:** ${musicTitle}\n` +
      `👤 **Artist:** ${musicAuthor}\n` +
      `📱 **Video by:** ${videoAuthor}\n` +
      `⏱️ **Duration:** ${durationStr}\n` +
      `👁️ **Views:** ${playCount}\n` +
      `📦 **Size:** ${fileSizeMB} MB\n` +
      `━━━━━━━━━━━━━━━━`,
      event.threadID
    );
    */

  } catch (err) {
    console.error('TikTok song error:', err.message);
    api.editMessage(`❌ Error: ${err.message}`, searchingMsg?.messageID || event.messageID);
  }
};

// Helper function to format duration (seconds to mm:ss)
function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to format numbers (e.g., 1555222 -> 1.6M)
function formatNumber(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}
