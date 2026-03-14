/**
 * OnlyTik – Send a random TikTok video
 *
 * Endpoint: https://haji-mix-api.gleeze.com/api/onlytik?stream=false
 *
 * Dependencies:
 *   - axios
 *   - fs
 *   - path
 *
 * Usage:  !onlytik
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: 'onlytik',
  version: '1.3.0',
  role: 0,
  credits: 'HackerGPT',
  description: 'Send a random TikTok video from the OnlyTik API (stream=false)',
  usages: '',
  cooldown: 3,
  hasPrefix: true,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // Tell the user we’re working
  api.setMessageReaction('⏳', messageID, () => {}, true);

  const apiUrl = 'https://haji-mix-api.gleeze.com/api/onlytik?stream=false';

  try {
    const res = await axios.get(apiUrl, {
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (OnlyTikBot)' },
    });

    // ---- DEBUG ---------------------------------------------------------
    const raw = JSON.stringify(res.data, null, 2);
    console.log('[OnlyTik] raw payload:', raw);
    // --------------------------------------------------------------------

    // ---- NORMALISE the list of videos ----------------------------------
    let videos = [];

    if (Array.isArray(res.data)) {
      // API returned an array at the root
      videos = res.data;
    } else if (Array.isArray(res.data?.videos)) {
      // API returned { videos: [...] }
      videos = res.data.videos;
    } else if (Array.isArray(res.data?.data?.videos)) {
      // API returned { data: { videos: [...] } }
      videos = res.data.data.videos;
    } else if (Array.isArray(res.data?.data?.items)) {
      // Some forks use data.items
      videos = res.data.data.items;
    } else if (Array.isArray(res.data?.data?.results)) {
      // data.results
      videos = res.data.data.results;
    } else if (Array.isArray(res.data?.items)) {
      // root array under .items
      videos = res.data.items;
    }

    if (!Array.isArray(videos) || videos.length === 0) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(
        '❌ No video found. Try again later.',
        threadID,
        messageID
      );
    }

    // ---- SELECT A RANDOM VIDEO -----------------------------------------
    const vid = videos[Math.floor(Math.random() * videos.length)];
    // Some results expose the MP4 in `play`, `wmplay`, or `video` → fall back
    const videoUrl = vid.play || vid.wmplay || vid.video || vid.url;

    if (!videoUrl) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(
        '❌ Could not locate a video URL in the API response.',
        threadID,
        messageID
      );
    }

    // ---- DOWNLOAD the MP4 ----------------------------------------------
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const fileName = `onlytik_${Date.now()}.mp4`;
    const filePath = path.join(cacheDir, fileName);

    const videoRes = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: { 'Accept': 'video/mp4' },
    });

    fs.writeFileSync(filePath, videoRes.data);

    // ---- SEND the attachment -------------------------------------------
    api.sendMessage(
      {
        body: '🎵 Random TikTok 🎬',
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      () => {
        // Clean up temp file
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
      },
      messageID
    );

    api.setMessageReaction('✅', messageID, () => {}, true);

  } catch (e) {
    console.error('[OnlyTik] error:', e);
    api.setMessageReaction('❌', messageID, () => {}, true);
    const errMsg =
      e.response && e.response.status
        ? `❌ Request failed (${e.response.status})`
        : `❌ ${e.message}`;
    api.sendMessage(errMsg, threadID, messageID);
  }
};
