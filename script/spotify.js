const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const SEARCH_URL = 'https://rapido-api.vercel.app/api/sp';
const API_KEY = 'zk-f50c8cb6ab9a0932f90abe0ea147959f227845da812fbeb30c8e114950a3ddd4';

module.exports.config = {
  name: "spotify",
  version: "3.0.0",
  role: 0,
  hasPrefix: true,
  aliases: ['sp'],
  usage: 'spotify [song name]',
  description: 'Download MP3 from Spotify',
  credits: 'Selov',
  cooldown: 10
};

module.exports.run = async function ({ api, event, args }) {
  const songName = args.join(' ');
  if (!songName) {
    return api.sendMessage(`🎵 Usage: spotify <song name>\nExample: spotify Umbrella`, event.threadID, event.messageID);
  }

  const searchingMsg = await api.sendMessage(`🔍 Searching for "${songName}"...`, event.threadID);

  try {
    // Search Spotify
    const searchRes = await axios.get(`${SEARCH_URL}?query=${encodeURIComponent(songName)}&apikey=${API_KEY}`);
    
    // Extract tracks from response
    let tracks = [];
    
    if (searchRes.data && Array.isArray(searchRes.data)) {
      tracks = searchRes.data;
    } else if (searchRes.data && searchRes.data.result && Array.isArray(searchRes.data.result)) {
      tracks = searchRes.data.result;
    } else if (searchRes.data && typeof searchRes.data === 'object') {
      tracks = Object.values(searchRes.data).filter(item => item && typeof item === 'object');
    }

    if (tracks.length === 0) {
      return api.editMessage(`❌ No results found.`, searchingMsg.messageID);
    }

    // Get first track
    const track = tracks[0];
    
    // Extract track info
    const title = track.name || track.title || "Unknown Title";
    const artist = track.artist || "Unknown Artist";
    
    // Look for download URL in different fields
    let downloadUrl = track.downloadUrl || track.mp3Url || track.audioUrl;
    
    // If no direct download URL, try to get from Spotify URL
    if (!downloadUrl && track.url) {
      await api.editMessage(`🔄 Getting download link...`, searchingMsg.messageID);
      
      // Try using a different endpoint if available
      try {
        const dlRes = await axios.get(`https://spotify-downloader.example.com/?url=${encodeURIComponent(track.url)}`);
        if (dlRes.data && dlRes.data.downloadUrl) {
          downloadUrl = dlRes.data.downloadUrl;
        }
      } catch (e) {
        console.log("Download endpoint error:", e.message);
      }
    }

    if (!downloadUrl) {
      return api.editMessage(`❌ No download link available for this track.`, searchingMsg.messageID);
    }

    await api.editMessage(`⬇️ Downloading: ${title} - ${artist}...`, searchingMsg.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    
    const filePath = path.join(cacheDir, `spotify_${Date.now()}.mp3`);
    
    // Download the MP3 file
    const downloadRes = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(filePath);
    downloadRes.data.pipe(writer);

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

    // Delete the searching message
    await api.unsendMessage(searchingMsg.messageID);

    // Send ONLY the MP3 file - no text, no image
    api.sendMessage({
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      // Clean up file after sending
      fs.unlinkSync(filePath);
    }, event.messageID);

  } catch (err) {
    console.error('Spotify error:', err.message);
    api.editMessage(`❌ Error: ${err.message}`, searchingMsg?.messageID || event.messageID);
  }
};
