const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const SEARCH_API = 'https://doux.gleeze.com/search/ytsearch';
const DOWNLOAD_API = 'https://sunny-imput-net.onrender.com/ytdl';

module.exports.config = {
  name: "music",
  version: "2.0.0",
  role: 0,
  hasPrefix: true,
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
    // STEP 1: Search YouTube using doux.gleeze.com
    console.log(`Searching for: ${query}`);
    const searchRes = await axios.get(`${SEARCH_API}?query=${encodeURIComponent(query)}`, {
      timeout: 15000
    });

    console.log("Search response:", JSON.stringify(searchRes.data, null, 2));

    // Check if search was successful and has results
    if (!searchRes.data?.success || !searchRes.data?.results || searchRes.data.results.length === 0) {
      return api.editMessage(`❌ No results found for "${query}".`, searchingMsg.messageID);
    }

    // Get the first video result
    const video = searchRes.data.results[0];
    const videoUrl = video.url;
    const videoTitle = video.title || "Unknown Title";
    const channelName = video.author || "Unknown Channel";
    const duration = video.duration || "Unknown";
    const views = formatNumber(video.views);

    console.log(`Found video: ${videoTitle} - ${videoUrl}`);

    await api.editMessage(`✅ Found: **${videoTitle}**\n⬇️ Getting MP3...`, searchingMsg.messageID);

    // STEP 2: Get MP3 download link from sunny-imput-net
    console.log(`Requesting MP3 from: ${DOWNLOAD_API}`);
    const downloadRes = await axios.get(`${DOWNLOAD_API}?_0x1b5a=${encodeURIComponent(videoUrl)}&_0x2d7c=mp3`, {
      timeout: 30000
    });

    console.log("Download response:", JSON.stringify(downloadRes.data, null, 2));

    // Check if download API returned successfully
    if (!downloadRes.data) {
      throw new Error("Download API returned empty response");
    }

    if (downloadRes.data.status !== 'ok') {
      throw new Error(`API Error: ${downloadRes.data.msg || 'Unknown error'}`);
    }

    if (!downloadRes.data.link) {
      throw new Error("No download link in response");
    }

    const mp3Url = downloadRes.data.link;
    const fileSizeMB = downloadRes.data.filesize ? (downloadRes.data.filesize / (1024 * 1024)).toFixed(2) : 'Unknown';

    await api.editMessage(`📥 Downloading MP3${fileSizeMB !== 'Unknown' ? ` (${fileSizeMB} MB)` : ''}...`, searchingMsg.messageID);

    // STEP 3: Download the MP3 file
    const cacheDir = path.join(__dirname, 'cache', 'music');
    await fs.ensureDir(cacheDir);
    
    const filePath = path.join(cacheDir, `music_${Date.now()}.mp3`);
    
    console.log(`Downloading MP3 from: ${mp3Url}`);
    
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

    console.log(`Download complete: ${filePath} (${stats.size} bytes)`);

    // Delete searching message
    await api.unsendMessage(searchingMsg.messageID);

    // Send ONLY the MP3 file
    api.sendMessage({
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      // Clean up file after sending
      fs.unlinkSync(filePath);
      console.log("File deleted");
    }, event.messageID);

  } catch (err) {
    console.error('❌ Music command error:', err);
    console.error('Error stack:', err.stack);
    
    // Detailed error message
    let errorMsg = `❌ Error: ${err.message || 'Unknown error'}`;
    
    if (err.response) {
      errorMsg += `\nStatus: ${err.response.status}`;
      errorMsg += `\nData: ${JSON.stringify(err.response.data)}`;
    }
    
    api.editMessage(errorMsg, searchingMsg?.messageID || event.messageID);
  }
};

// Helper function to format numbers
function formatNumber(num) {
  if (!num) return 'Unknown';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}
