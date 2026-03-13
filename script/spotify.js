const axios = require("axios");

module.exports.config = {
  name: "spotify",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Search for songs on Spotify",
  commandCategory: "music",
  usages: "spotify <song name>",
  cooldowns: 2
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ").trim();

  try {
    // Get sender name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} searched Spotify for: ${query || "nothing"}`);

    if (!query) {
      return api.sendMessage(
        "🎵 Please enter a song name.\n\nExample: spotify Umaasa", 
        threadID, 
        messageID
      );
    }

    api.sendMessage("🔍 Searching Spotify...", threadID, messageID);

    // Your API with the working key
    const apiUrl = `https://rapido-api.vercel.app/api/sp?query=${encodeURIComponent(query)}&apikey=zk-f50c8cb6ab9a0932f90abe0ea147959f227845da812fbeb30c8e114950a3ddd4`;
    
    const res = await axios.get(apiUrl);
    
    // Remove the maintainer field and get tracks
    const { maintainer, ...tracks } = res.data;
    const trackList = Object.values(tracks);

    if (!trackList || trackList.length === 0) {
      return api.sendMessage("❌ No songs found for your query.", threadID, messageID);
    }

    // Store search results in memory for this thread
    memory[threadID].lastSearch = {
      tracks: trackList,
      timestamp: Date.now()
    };

    // Format the results
    let reply = `🎵 SPOTIFY SEARCH RESULTS\n━━━━━━━━━━━━━━━━\n`;
    reply += `Query: "${query}"\n`;
    reply += `Found: ${trackList.length} track(s)\n━━━━━━━━━━━━━━━━\n\n`;

    trackList.slice(0, 10).forEach((track, index) => {
      reply += `${index + 1}. 🎤 ${track.name}\n`;
      reply += `   👤 Artist: ${track.artist}\n`;
      reply += `   ⏱️ Duration: ${track.duration}\n`;
      reply += `   📅 Release: ${track.release}\n`;
      reply += `   🔗 Link: ${track.url}\n`;
      if (track.image) reply += `   🖼️ Image: ${track.image}\n`;
      reply += `\n`;
    });

    reply += `━━━━━━━━━━━━━━━━\n`;
    reply += `💡 Reply with the number (1-${Math.min(10, trackList.length)}) to get more details.`;

    // Store in memory
    memory[threadID].push(`Spotify search returned ${trackList.length} results`);

    api.sendMessage(reply, threadID, (err, info) => {
      if (err) return console.error(err);
      
      // Store the message ID for reply handling
      if (!memory[threadID].replyHandlers) memory[threadID].replyHandlers = {};
      memory[threadID].replyHandlers[info.messageID] = {
        tracks: trackList,
        expires: Date.now() + 300000 // 5 minutes expiry
      };
    }, messageID);

  } catch (err) {
    console.error("Spotify Command Error:", err);
    
    api.sendMessage(
      `❌ Error: ${err.message}`,
      threadID,
      messageID
    );
  }
};

// Handle replies to show more details
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  const choice = parseInt(body);

  try {
    // Check if choice is valid
    if (isNaN(choice) || choice < 1 || choice > handleReply.tracks.length) {
      return api.sendMessage(
        `❌ Please reply with a valid number between 1 and ${handleReply.tracks.length}.`, 
        threadID, 
        messageID
      );
    }

    const track = handleReply.tracks[choice - 1];
    
    // Get sender name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    let details = `🎵 TRACK DETAILS\n━━━━━━━━━━━━━━━━\n`;
    details += `🎤 Title: ${track.name}\n`;
    details += `👤 Artist: ${track.artist}\n`;
    details += `⏱️ Duration: ${track.duration}\n`;
    details += `📅 Release Date: ${track.release}\n`;
    details += `━━━━━━━━━━━━━━━━\n`;
    details += `🔗 Listen on Spotify:\n${track.url}\n`;
    details += `━━━━━━━━━━━━━━━━\n`;
    if (track.image) {
      details += `🖼️ Album Art: ${track.image}\n`;
    }
    details += `💬 Requested by: ${senderName}`;

    // Store in memory
    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} selected: ${track.name} by ${track.artist}`);

    api.sendMessage(details, threadID, messageID);

  } catch (err) {
    console.error("Spotify Reply Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
