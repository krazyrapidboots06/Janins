const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const SEARCH_API = 'https://api.ferdev.my.id/search/tiktok';
const CONVERT_API = 'https://api.ferdev.my.id/tools/toaudio';
const API_KEY = 'fdv_99SxsNRprZzIiLxRu3JJlA';

module.exports.config = {
  name: "song",
  version: "1.0.0",
  role: 0,
  hasPrefix: true,
  aliases: ['music', 'audio'],
  usage: 'song [search query]',
  description: 'Search TikTok videos and download as MP3',
  credits: 'Selov',
  cooldown: 10
};

module.exports.run = async function ({ api, event, args }) {
  const query = args.join(' ').trim();
  
  if (!query) {
    return api.sendMessage(
      `🎵 **Usage:** song <search query>\n` +
      `📱 **Example:** song Roar I can't handle change`,
      event.threadID,
      event.messageID
    );
  }

  const searchingMsg = await api.sendMessage(`🔍 Searching TikTok for "${query}"...`, event.threadID);

  try {
    // Search for TikTok videos
    const searchRes = await axios.get(`${SEARCH_API}?query=${encodeURIComponent(query)}&apikey=${API_KEY}`, {
      timeout: 15000
    });

    // Check if search was successful
    if (!searchRes.data?.success || !searchRes.data?.result || searchRes.data.result.length === 0) {
      return api.editMessage(`❌ No results found for "${query}".`, searchingMsg.messageID);
    }

    // Get first 5 video URLs
    const videoUrls = searchRes.data.result.slice(0, 5);
    
    // Create selection message
    let trackList = `🎵 **Found ${videoUrls.length} results:**\n━━━━━━━━━━━━━━━━\n`;
    videoUrls.forEach((url, index) => {
      // Extract filename from URL for a simple title
      const filename = url.split('/').pop() || `Video ${index + 1}`;
      trackList += `${index + 1}. **TikTok Video ${index + 1}**\n`;
      trackList += `   🔗 ${filename.substring(0, 30)}...\n\n`;
    });
    trackList += `━━━━━━━━━━━━━━━━\n💡 Reply with the number (1-${videoUrls.length}) to download MP3.`;

    // Store results for reply handling
    if (!global.songSearches) global.songSearches = {};
    global.songSearches[searchingMsg.messageID] = {
      videoUrls: videoUrls,
      query: query
    };

    await api.editMessage(trackList, searchingMsg.messageID);

  } catch (err) {
    console.error('Search error:', err.message);
    api.editMessage(`❌ Search failed: ${err.message}`, searchingMsg.messageID);
  }
};

// Handle reply to download and convert selected video
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;

  if (!global.songSearches || !global.songSearches[handleReply.messageID]) {
    return api.sendMessage("❌ Search expired. Please search again.", threadID, messageID);
  }

  const choice = parseInt(body);
  const { videoUrls, query } = global.songSearches[handleReply.messageID];

  if (isNaN(choice) || choice < 1 || choice > videoUrls.length) {
    return api.sendMessage(`❌ Please reply with a number 1-${videoUrls.length}.`, threadID, messageID);
  }

  const selectedVideoUrl = videoUrls[choice - 1];
  const downloadMsg = await api.sendMessage(`🔄 Converting video to MP3...`, threadID);

  try {
    // Call the conversion API
    const convertRes = await axios.get(`${CONVERT_API}?link=${encodeURIComponent(selectedVideoUrl)}&apikey=${API_KEY}`, {
      timeout: 30000
    });

    // Check if conversion was successful
    if (!convertRes.data?.success || !convertRes.data?.downloadUrl) {
      throw new Error(convertRes.data?.message || "Conversion failed");
    }

    const mp3Url = convertRes.data.downloadUrl;
    
    await api.editMessage(`⬇️ Downloading MP3...`, downloadMsg.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, 'cache', 'songs');
    await fs.ensureDir(cacheDir);
    
    const filePath = path.join(cacheDir, `song_${Date.now()}.mp3`);
    
    // Download the MP3 file
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

    // Check file size (max 25MB)
    const stats = fs.statSync(filePath);
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(filePath);
      return api.editMessage(`⚠️ File too large (max 25MB).`, downloadMsg.messageID);
    }

    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    // Delete status messages
    await api.unsendMessage(downloadMsg.messageID);
    await api.unsendMessage(handleReply.messageID);

    // Send ONLY the MP3 file
    api.sendMessage({
      attachment: fs.createReadStream(filePath)
    }, threadID, () => {
      // Clean up file after sending
      fs.unlinkSync(filePath);
    }, messageID);

    // Clean up stored search
    delete global.songSearches[handleReply.messageID];

    // Optional: Send a quick confirmation (comment out if you want pure audio only)
    // api.sendMessage(`✅ MP3 ready! (${fileSizeMB} MB)`, threadID);

  } catch (err) {
    console.error('Conversion error:', err.message);
    api.editMessage(`❌ Failed to convert: ${err.message}`, downloadMsg.messageID);
  }
};
