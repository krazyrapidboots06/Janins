const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const SEARCH_API = 'https://oreo.gleeze.com/api/youtube';
const DOWNLOAD_API = 'https://sunny-imput-net.onrender.com/ytdl';

module.exports.config = {
  name: "music",
  version: "1.0.0",
  role: 0,
  hasPrefix: false,
  aliases: ['song', 'play'],
  usage: 'music [song name]',
  description: 'Search YouTube and download as MP3',
  credits: 'Selov',
  cooldown: 10
};

module.exports.run = async function ({ api, event, args }) {
  const query = args.join(' ').trim();
  
  if (!query) {
    return api.sendMessage(
      `🎵 **Usage:** music <song name>\n` +
      `📱 **Example:** music umaasa`,
      event.threadID,
      event.messageID
    );
  }

  const searchingMsg = await api.sendMessage(`🔍 Searching for "${query}"...`, event.threadID);

  try {
    // Step 1: Search YouTube using oreo.gleeze.com
    const searchRes = await axios.get(`${SEARCH_API}?search=${encodeURIComponent(query)}&stream=false&limit=1`, {
      timeout: 15000
    });

    // Check if search returned results
    if (!searchRes.data || searchRes.data.length === 0) {
      return api.editMessage(`❌ No results found for "${query}".`, searchingMsg.messageID);
    }

    // Get the first video result
    const video = searchRes.data[0];
    const videoUrl = video.url || `https://youtube.com/watch?v=${video.videoId}`;
    const videoTitle = video.title || "Unknown Title";
    const channelName = video.author?.name || "Unknown Channel";
    const duration = video.timestamp || formatDuration(video.seconds);
    const views = formatNumber(video.views);

    await api.editMessage(`✅ Found: **${videoTitle}**\n⬇️ Getting MP3...`, searchingMsg.messageID);

    // Step 2: Get MP3 download link from sunny-imput-net
    const downloadRes = await axios.get(`${DOWNLOAD_API}?_0x1b5a=${encodeURIComponent(videoUrl)}&_0x2d7c=mp3`, {
      timeout: 30000
    });

    // Check if download API returned successfully
    if (!downloadRes.data || downloadRes.data.status !== 'ok' || !downloadRes.data.link) {
      throw new Error(downloadRes.data?.msg || "Failed to get download link");
    }

    const mp3Url = downloadRes.data.link;
    const fileSizeMB = (downloadRes.data.filesize / (1024 * 1024)).toFixed(2);

    await api.editMessage(`📥 Downloading MP3 (${fileSizeMB} MB)...`, searchingMsg.messageID);

    // Step 3: Download the MP3 file
    const cacheDir = path.join(__dirname, 'cache', 'music');
    await fs.ensureDir(cacheDir);
    
    const filePath = path.join(cacheDir, `music_${Date.now()}.mp3`);
    
    const downloadStream = await axios({
      method: 'GET',
      url: mp3Url,
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

    // Verify file was downloaded
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    // Delete searching message
    await api.unsendMessage(searchingMsg.messageID);

    // Send ONLY the MP3 file
    api.sendMessage({
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      // Clean up file after sending
      fs.unlinkSync(filePath);
    }, event.messageID);

    // Optional: Send a quick info message (comment out if you want pure audio only)
    // api.sendMessage(
    //   `🎵 **Downloaded**\n` +
    //   `━━━━━━━━━━━━━━━━\n` +
    //   `**Title:** ${videoTitle}\n` +
    //   `**Channel:** ${channelName}\n` +
    //   `**Duration:** ${duration}\n` +
    //   `**Views:** ${views}\n` +
    //   `**Size:** ${fileSizeMB} MB`,
    //   event.threadID
    // );

  } catch (err) {
    console.error('Music command error:', err.message);
    api.editMessage(`❌ Error: ${err.message}`, searchingMsg?.messageID || event.messageID);
  }
};

// Helper function to format duration
function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to format numbers
function formatNumber(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}
