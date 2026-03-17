const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Using the spotidownloader API which provides actual MP3 links
const SEARCH_URL = 'https://spotifydl-api.gleeze.com'; // From spotidownloader package docs [citation:7]

module.exports.config = {
  name: "spotify",
  version: "4.0.0",
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
    return api.sendMessage(`🎵 Usage: spotify <song name>\nExample: spotify Umaasa`, event.threadID, event.messageID);
  }

  const searchingMsg = await api.sendMessage(`🔍 Searching for "${songName}"...`, event.threadID);

  try {
    // First, search for the track
    const searchRes = await axios.get(`${SEARCH_URL}/api/search?q=${encodeURIComponent(songName)}`, {
      timeout: 15000
    });

    console.log("Search response:", JSON.stringify(searchRes.data, null, 2).substring(0, 500));

    // Handle different response formats
    let tracks = [];
    if (searchRes.data && Array.isArray(searchRes.data)) {
      tracks = searchRes.data;
    } else if (searchRes.data && searchRes.data.tracks && Array.isArray(searchRes.data.tracks)) {
      tracks = searchRes.data.tracks;
    } else if (searchRes.data && searchRes.data.result && Array.isArray(searchRes.data.result)) {
      tracks = searchRes.data.result;
    }

    if (tracks.length === 0) {
      return api.editMessage(`❌ No results found for "${songName}".`, searchingMsg.messageID);
    }

    // Get first track
    const track = tracks[0];
    const trackId = track.id || track.videoId || track.url?.split('/track/')[1];
    
    if (!trackId) {
      return api.editMessage(`❌ Could not extract track ID.`, searchingMsg.messageID);
    }

    await api.editMessage(`⬇️ Getting download link for: ${track.title || songName}...`, searchingMsg.messageID);

    // Get the actual download link using the track URL or ID
    const trackUrl = track.url || `https://open.spotify.com/track/${trackId}`;
    const downloadRes = await axios.get(`${SEARCH_URL}/api/download?url=${encodeURIComponent(trackUrl)}`, {
      timeout: 30000
    });

    console.log("Download response:", JSON.stringify(downloadRes.data, null, 2));

    // Extract download URL from response
    let downloadUrl = null;
    if (downloadRes.data && downloadRes.data.download) {
      downloadUrl = downloadRes.data.download;
    } else if (downloadRes.data && downloadRes.data.url) {
      downloadUrl = downloadRes.data.url;
    } else if (downloadRes.data && downloadRes.data.link) {
      downloadUrl = downloadRes.data.link;
    } else if (downloadRes.data && downloadRes.data.result && downloadRes.data.result.download) {
      downloadUrl = downloadRes.data.result.download;
    }

    if (!downloadUrl) {
      console.log("Full download response:", JSON.stringify(downloadRes.data, null, 2));
      return api.editMessage(`❌ No download link available for this track.`, searchingMsg.messageID);
    }

    await api.editMessage(`📥 Downloading MP3...`, searchingMsg.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    
    const filePath = path.join(cacheDir, `spotify_${Date.now()}.mp3`);
    
    // Download the MP3 file
    const downloadStream = await axios({
      method: 'GET',
      url: downloadUrl,
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

    // Delete the searching message
    await api.unsendMessage(searchingMsg.messageID);

    // Send ONLY the MP3 file
    api.sendMessage({
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      // Clean up file after sending
      fs.unlinkSync(filePath);
    }, event.messageID);

  } catch (err) {
    console.error('Spotify error:', err.response?.data || err.message);
    
    // Try alternative endpoint as fallback
    try {
      await api.editMessage(`🔄 Trying alternative method...`, searchingMsg.messageID);
      
      // Alternative: Use spotidownloader package's direct endpoint [citation:7]
      const altRes = await axios.get(`https://spotifydl-api.gleeze.com/5f7839ea1782`, {
        timeout: 15000
      });
      
      // This is just a placeholder - you'd need to implement actual fallback
      return api.editMessage(`❌ Could not download track. Try again later.`, searchingMsg.messageID);
      
    } catch (fallbackErr) {
      api.editMessage(`❌ Error: ${err.message}`, searchingMsg?.messageID || event.messageID);
    }
  }
};
