const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const yts = require('yt-search');

const CONFIG_URL = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

// Helper function to get stream from URL
async function getStreamFromURL(url) {
  const response = await axios({ url, responseType: 'stream' });
  return response.data;
}

// Helper function to download song
async function downloadSong(baseApi, url, api, event, title = null) {
  try {
    const apiUrl = `${baseApi}/play?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl);
    const data = res.data;

    if (!data.status || !data.downloadUrl) throw new Error("API failed to return download URL.");

    const songTitle = title || data.title;
    const fileName = `${songTitle.replace(/[\\/:"*?<>|]/g, '')}_${Date.now()}.mp3`;
    
    // Create cache directory
    const cacheDir = path.join(__dirname, 'cache', 'songs');
    await fs.ensureDir(cacheDir);
    
    const filePath = path.join(cacheDir, fileName);

    const songData = await axios.get(data.downloadUrl, { responseType: 'arraybuffer' });
    await fs.writeFile(filePath, songData.data);

    // Send audio only
    await api.sendMessage({
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => fs.unlinkSync(filePath), event.messageID);

  } catch (err) {
    console.error('Download error:', err);
    api.sendMessage(`❌ Failed to download song: ${err.message}`, event.threadID, event.messageID);
  }
}

module.exports.config = {
  name: "sing",
  version: "1.0.0",
  role: 0,
  credits: "ArYAN",
  description: "Search and download music from YouTube",
  commandCategory: "music",
  usages: "/sing <song name or YouTube URL>",
  cooldowns: 5,
  aliases: ["play", "music"]
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ").trim();

  // Fetch API configuration
  let baseApi;
  try {
    const configRes = await axios.get(CONFIG_URL);
    baseApi = configRes.data?.api;
    if (!baseApi) throw new Error("Missing API in configuration");
  } catch (error) {
    return api.sendMessage("❌ Failed to fetch API configuration.", threadID, messageID);
  }

  if (!query) {
    return api.sendMessage("🎵 Please provide a song name or YouTube URL.\nExample: /sing Umaasa", threadID, messageID);
  }

  // Check if input is a YouTube URL
  if (query.startsWith("http")) {
    return downloadSong(baseApi, query, api, event);
  }

  try {
    // Search for the song
    const searchMsg = await api.sendMessage(`🔍 Searching for "${query}"...`, threadID);
    
    const searchRes = await yts(query);
    const results = searchRes.videos.slice(0, 6);
    
    if (!results.length) {
      await api.unsendMessage(searchMsg.messageID);
      return api.sendMessage("❌ No results found.", threadID, messageID);
    }

    // Create selection message
    let msg = "🎵 **Select a song to download:**\n━━━━━━━━━━━━━━━━\n";
    results.forEach((v, i) => {
      msg += `${i + 1}. **${v.title}**\n`;
      msg += `   ⏱ ${v.timestamp} | 👀 ${v.views.toLocaleString()}\n\n`;
    });
    msg += "━━━━━━━━━━━━━━━━\n💡 Reply with the number (1-6) to download.";

    // Get thumbnails for preview
    const thumbs = await Promise.all(
      results.slice(0, 3).map(v => getStreamFromURL(v.thumbnail).catch(() => null))
    ).then(streams => streams.filter(s => s));

    await api.unsendMessage(searchMsg.messageID);

    // Send selection message and store reply handler
    api.sendMessage({
      body: msg,
      attachment: thumbs
    }, threadID, (err, info) => {
      if (err) return console.error(err);
      
      // Store in global reply handlers
      if (!global.singReplyHandlers) global.singReplyHandlers = {};
      global.singReplyHandlers[info.messageID] = {
        results,
        baseApi,
        author: senderID,
        messageID: info.messageID
      };
    }, messageID);

  } catch (err) {
    console.error('Search error:', err);
    api.sendMessage("❌ Failed to search YouTube.", threadID, messageID);
  }
};

// Handle reply to download selected song
module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply } = event;

  if (!messageReply) return;
  
  const repliedMessageID = messageReply.messageID;
  const handlerData = global.singReplyHandlers?.[repliedMessageID];

  if (!handlerData || handlerData.author !== senderID) return;

  const choice = parseInt(body);
  if (isNaN(choice) || choice < 1 || choice > handlerData.results.length) {
    return api.sendMessage(`❌ Please reply with a valid number (1-${handlerData.results.length}).`, threadID, messageID);
  }

  // Delete the handler
  delete global.singReplyHandlers[repliedMessageID];

  const selected = handlerData.results[choice - 1];
  await api.unsendMessage(repliedMessageID);

  // Download the selected song
  await downloadSong(handlerData.baseApi, selected.url, api, event, selected.title);
};
