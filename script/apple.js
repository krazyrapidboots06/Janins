const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "apple",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Search and play Apple Music previews",
  commandCategory: "music",
  usages: "apple <song name>",
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
    memory[threadID].push(`${senderName} searched Apple Music for: ${query || "nothing"}`);

    if (!query) {
      return api.sendMessage(
        "🎵 Please enter a song name.\n\nExample: apple Umaasa", 
        threadID, 
        messageID
      );
    }

    const searching = await api.sendMessage("🔍 Searching Apple Music...", threadID, messageID);

    // Your working API
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/shazam?title=${encodeURIComponent(query)}&limit=5`;
    
    const res = await axios.get(apiUrl);
    const tracks = res.data.results;

    if (!tracks || tracks.length === 0) {
      return api.sendMessage("❌ No songs found.", threadID, messageID);
    }

    // Store search results in memory
    memory[threadID].lastSearch = {
      tracks: tracks,
      timestamp: Date.now(),
      messageID: searching.messageID
    };

    // Format the results
    let reply = `🎵 APPLE MUSIC SEARCH\n━━━━━━━━━━━━━━━━\n`;
    reply += `Query: "${query}"\n`;
    reply += `Found: ${tracks.length} track(s)\n━━━━━━━━━━━━━━━━\n\n`;

    tracks.forEach((track, index) => {
      reply += `${index + 1}. 🎤 ${track.title}\n`;
      reply += `   👤 Artist: ${track.artistName}\n`;
      reply += `   💿 Album: ${track.albumName}\n`;
      
      // Format duration from milliseconds
      const minutes = Math.floor(track.durationInMillis / 60000);
      const seconds = ((track.durationInMillis % 60000) / 1000).toFixed(0);
      reply += `   ⏱️ Duration: ${minutes}:${seconds.padStart(2, '0')}\n`;
      
      reply += `   📅 Release: ${track.releaseDate}\n`;
      reply += `   🎵 Genre: ${track.genreNames.join(', ')}\n`;
      reply += `\n`;
    });

    reply += `━━━━━━━━━━━━━━━━\n`;
    reply += `💡 Reply with the number (1-${tracks.length}) to hear a 30-second preview.`;

    // Update the searching message with results
    return api.editMessage(reply, searching.messageID);

  } catch (err) {
    console.error("Apple Music Error:", err);
    
    return api.sendMessage(
      `❌ Error: ${err.message}`,
      threadID,
      messageID
    );
  }
};

// Handle replies to play previews
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  
  try {
    // Check if we have stored tracks
    if (!memory[threadID] || !memory[threadID].lastSearch) {
      return api.sendMessage(
        "❌ No active search found. Please do a new search with 'apple <song name>'.", 
        threadID, 
        messageID
      );
    }

    const choice = parseInt(body);
    const tracks = memory[threadID].lastSearch.tracks;

    // Validate choice
    if (isNaN(choice) || choice < 1 || choice > tracks.length) {
      return api.sendMessage(
        `❌ Please reply with a valid number between 1 and ${tracks.length}.`, 
        threadID, 
        messageID
      );
    }

    const track = tracks[choice - 1];
    
    // Check if preview URL exists
    if (!track.previewUrl) {
      return api.sendMessage("❌ No preview available for this track.", threadID, messageID);
    }

    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Send "downloading" message
    const downloading = await api.sendMessage("⏳ Downloading preview...", threadID, messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download the preview audio
    const audioPath = path.join(cacheDir, `apple_${Date.now()}.m4a`);
    const audioRes = await axios.get(track.previewUrl, { 
      responseType: "arraybuffer",
      timeout: 15000 
    });

    fs.writeFileSync(audioPath, audioRes.data);

    // Format duration
    const minutes = Math.floor(track.durationInMillis / 60000);
    const seconds = ((track.durationInMillis % 60000) / 1000).toFixed(0);

    // Send the audio preview
    api.sendMessage(
      {
        body: `🎵 APPLE MUSIC PREVIEW\n━━━━━━━━━━━━━━━━\n` +
              `🎤 ${track.title}\n` +
              `👤 ${track.artistName}\n` +
              `💿 ${track.albumName}\n` +
              `⏱️ ${minutes}:${seconds.padStart(2, '0')}\n` +
              `━━━━━━━━━━━━━━━━\n` +
              `🔗 Full song: ${track.appleMusicUrl}\n` +
              `💬 Requested by: ${senderName}`,
        attachment: fs.createReadStream(audioPath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending preview:", err);
        // Clean up file
        try {
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
        } catch (e) {
          console.error("Error deleting file:", e);
        }
      },
      messageID
    );

    // Update the downloading message
    api.editMessage("✅ Preview ready! Sending...", downloading.messageID);

    // Store in memory
    memory[threadID].push(`${senderName} played preview: ${track.title} by ${track.artistName}`);

  } catch (err) {
    console.error("Apple Music Reply Error:", err);
    return api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
