const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "brat",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Generate brat style image from text",
  commandCategory: "ai",
  usages: "brat <text>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const text = args.join(" ");

  if (!text) {
    return api.sendMessage(
      "🖼 Please provide text to generate an image.\n\nExample:\n brat hello world",
      threadID,
      messageID
    );
  }

  try {
    const waiting = await api.sendMessage("🎨 Generating brat image... please wait.", threadID, messageID);

    // WORKING API - using rapidapi brat generator
    const apiUrl = `https://brat.caliphdev.com/api/brat?text=${encodeURIComponent(text)}`;
    
    console.log("Fetching from:", apiUrl); // Debug log
    
    // Get image directly (API returns image, not JSON)
    const response = await axios.get(apiUrl, { 
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Create cache directory if it doesn't exist
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Save image
    const imagePath = path.join(cacheDir, `brat_${Date.now()}.png`);
    fs.writeFileSync(imagePath, response.data);

    // Get file size
    const stats = fs.statSync(imagePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    // Delete waiting message
    api.unsendMessage(waiting.messageID);

    // Send the image
    api.sendMessage(
      {
        body: `🖼 BRAT GENERATOR\n━━━━━━━━━━━━━━━━\nText: ${text}\n📦 Size: ${fileSizeKB} KB\n━━━━━━━━━━━━━━━━`,
        attachment: fs.createReadStream(imagePath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending image:", err);
        // Clean up file
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (e) {
          console.error("Error deleting file:", e);
        }
      },
      messageID
    );

  } catch (err) {
    console.error("Brat Command Error:", err);
    
    // More specific error message
    let errorMessage = err.message;
    if (err.response) {
      errorMessage = `API returned status ${err.response.status}`;
    }
    
    api.sendMessage(`❌ Error generating image: ${errorMessage}`, threadID, messageID);
  }
};
