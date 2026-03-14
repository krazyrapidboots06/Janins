/**
 * OnlyTik – Send a random TikTok video
 *
 * API: https://haji-mix-api.gleeze.com/api/onlytik?stream=false
 *
 * Dependencies:
 *   - axios
 *   - fs
 *   - path
 *
 * Usage:
 *   !onlytik          (sends a random video)
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: 'onlytik',
  version: '1.2.0',
  role: 2,
  credits: 'selov',
  description: 'Send a random TikTok video from the OnlyTik API (non‑streaming version)',
  usages: '',
  cooldown: 3,
  hasPrefix: true,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // Indicate that the bot is working
  api.setMessageReaction('⏳', messageID, () => {}, true);

  // New endpoint – non‑streaming
  const apiUrl = 'https://haji-mix-api.gleeze.com/api/onlytik?stream=false';

  try {
    const res = await axios.get(apiUrl, { timeout: 30000 });

    // Log the raw payload for debugging
    console.log('OnlyTik raw payload (stream=false):', JSON.stringify(res.data, null, 2));

    // Normalise the list of videos – the new API can return:
    // • { data: { videos: [...] } }
    // • { videos: [...] }
    // • an array of video objects directly
    let videos = [];

    if (Array.isArray(res.data)) {
      videos = res.data;
    } else if (Array.isArray(res.data?.videos)) {
      videos = res.data.videos;
    } else if (res.data?.data?.videos && Array.isArray(res.data.data.videos)) {
      videos = res.data.data.videos;
    }

    if (!Array.isArray(videos) || videos.length === 0) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage('❌ No video found. Try again later.', threadID, messageID);
    }

    // Pick a random video if there’s more than one
    const videoInfo = videos[Math.floor(Math.random() * videos.length)];
    const videoUrl = videoInfo.play || videoInfo.wmplay;
    if (!videoUrl) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage('❌ No video URL available.', threadID, messageID);
    }

    // Prepare a local temp file
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `onlytik_${Date.now()}.mp4`);

    // Download the video
    const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 });
    fs.writeFileSync(filePath, videoRes.data);

    // Send it back to the thread
    api.sendMessage(
      { body: '🎵 Random TikTok 🎬', attachment: fs.createReadStream(filePath) },
      threadID,
      () => {
        // Delete the temporary file
        try { fs.unlinkSync(filePath); } catch (_) {}
      },
      messageID
    );

    api.setMessageReaction('✅', messageID, () => {}, true);

  } catch (err) {
    console.error('OnlyTik (stream=false) error:', err);
    api.setMessageReaction('❌', messageID, () => {}, true);
    const errMsg = err.response
      ? `❌ Request failed (${err.response.status})`
      : `❌ ${err.message}`;
    api.sendMessage(errMsg, threadID, messageID);
  }
};
