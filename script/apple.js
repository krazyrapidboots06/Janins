const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "apple",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Download Apple Music previews",
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
    memory[threadID].push(`${senderName} requested: ${query}`);

    if (!query) {
      return api.sendMessage(
        "🎵 Please enter a song name.\n\nExample: apple Umaasa", 
        threadID, 
        messageID
      );
    }

    const searching = await api.sendMessage("🔍 Searching Apple Music...", threadID, messageID);

    // Your working API with limit 1 for first result only
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/shazam?title=${encodeURIComponent(query)}&limit=1`;
    
    const res = await axios.get(apiUrl);
    const tracks = res.data.results;

    if (!tracks || tracks.length === 0) {
      return api.editMessage("❌ No songs found.", searching.messageID);
    }

    // Get the first track
    const track = tracks[0];
    
    // Check if preview URL exists
    if (!track.previewUrl) {
      return api.editMessage("❌ No preview available for this track.", searching.messageID);
    }

    // Update searching message
    api.editMessage(
      `📥 Downloading: ${track.title} by ${track.artistName}\n⏱️ Duration: ${formatDuration(track.durationInMillis)}\n📦 Please wait...`, 
      searching.messageID
    );

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download the preview audio (Apple Music previews are already small ~30 seconds)
    const audioPath = path.join(cacheDir, `apple_${Date.now()}.m4a`);
    const audioRes = await axios.get(track.previewUrl, { 
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    fs.writeFileSync(audioPath, audioRes.data);

    // Get file size (Apple Music previews are typically 200-500KB only)
    const stats = fs.statSync(audioPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);

    // Format duration
    const duration = formatDuration(track.durationInMillis);
    
    // Format genres
    const genres = track.genreNames.join(', ');

    // Send the audio preview
    api.sendMessage(
      {
        body: `🎵 APPLE MUSIC PREVIEW\n━━━━━━━━━━━━━━━━\n` +
              `🎤 Title: ${track.title}\n` +
              `👤 Artist: ${track.artistName}\n` +
              `💿 Album: ${track.albumName}\n` +
              `⏱️ Duration: ${duration}\n` +
              `🎵 Genre: ${genres}\n` +
              `📅 Released: ${track.releaseDate}\n` +
              `📦 Size: ${fileSizeInKB} KB\n` +
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

    // Update the searching message
    api.editMessage(`✅ Preview ready! (${fileSizeInKB} KB)`, searching.messageID);

    // Store in memory
    memory[threadID].push(`Downloaded: ${track.title} by ${track.artistName}`);

  } catch (err) {
    console.error("Apple Music Error:", err);
    
    return api.sendMessage(
      `❌ Error: ${err.message}`,
      threadID,
      messageID
    );
  }
};

// Helper function to format duration from milliseconds
function formatDuration(millis) {
  const minutes = Math.floor(millis / 60000);
  const seconds = ((millis % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}
