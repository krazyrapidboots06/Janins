/**
 * Pornhub Video Search – fetch one random video via the public API
 *
 * Usage:
 *   !pornsearch <query>
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: 'pornsearch',
  version: '1.0.0',
  role: 2,
  credits: 'selov',
  description: 'Search and get a single video from PornHub via the betadash‑api.',
  usages: '<query>',
  cooldown: 10, // seconds
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args.join(' ')) {
    return api.sendMessage('⚠️ You need to provide a search term.', threadID, messageID);
  }

  // Build the query string
  const encodedQuery = encodeURIComponent(args.join(' '));
  const url = `https://betadash-api-swordslush-production.up.railway.app/pornhub/search?q=${encodedQuery}&page=1&limit=1`;

  api.setMessageReaction('⏳', messageID, () => {}, true);

  try {
    // Set timeout to protect against slow API responses
    const res = await axios.get(url, { timeout: 30000 });

    let videoUrl;

    if (Array.isArray(res.data)) {
      if (!res.data.length) throw new Error('No results');
      videoUrl = res.data[0].url;
    } else if (typeof res.data === 'object') {
      const keysToCheck = ['url', 'link', 'video_url'];
      
      for (const key of keysToCheck) {
        if (res.data[key]) {
          videoUrl = res.data[key];
          break;
        }
      }
      if (!videoUrl && Array.isArray(res.data.results)) {
        // Fallback: search results may have different field names
        const firstRes = res.data.results[0] || {};
        for (const key of keysToCheck) {
          if (firstRes[key]) {
            videoUrl = firstRes[key];
            break;
          }
        }
      }
    }

    if (!videoUrl) throw new Error('Video URL not found');

    // ---- DOWNLOAD the video ------------------------------------------
    
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    // Extract filename from URL
    let fileName = videoUrl.split('/').pop() || `video_${Date.now()}`;
    if (fileName.includes('?')) fileName = fileName.split('?')[0];
    
    const filePath = path.join(cacheDir, `${fileName}.mp4`);

    try {
      console.log('[PornSearch] Downloading:', videoUrl);
      
      // Download the file with a reasonable timeout
      const videoData = await axios.get(videoUrl, { 
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: { Accept: 'video/mp4' }
      });

      fs.writeFileSync(filePath, videoData.data);

      // ---- SEND as attachment -----------------------------------------
      
      api.sendMessage(
        {
          body: `🔍 Here’s "${args.join(' ') || 'a PornHub video'}":`,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        () => { 
          try {
            fs.unlinkSync(filePath);
          } catch (e) {} 
        }, // cleanup callback
        messageID
      );

    } finally {
      api.setMessageReaction('✅', messageID, () => {}, true);
      
      console.log('[PornSearch] Video sent:', args.join(' ') || 'unknown query');
    }
    
  } catch (err) {
    console.error('[PornSearch]', err.message);
    api.setMessageReaction('❌', messageID, () => {}, true);
    
    const errMsg = `❌ ${args.join(' ')}: ${err.message}`;
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      errMsg += `\nDebug (query): "${encodedQuery}"\nError code: ${err.code}`;
    }
    
    api.sendMessage(errMsg, threadID, messageID);
  }
};
