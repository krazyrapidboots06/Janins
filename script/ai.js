const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "ai",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "AI with voice response",
  commandCategory: "search",
  usages: "ai <ask a questions>",
  cooldowns: 3
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, attachments, senderID } = event;

  let prompt = args.join(" ").trim();

  try {
    // Get user name safely
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Check image
    if (attachments && attachments.length > 0) {
      const photo = attachments.find(a => a.type === "photo");

      if (photo) {
        const imageUrl = photo.url;
        prompt = `Describe this photo in detail like a human:\n${imageUrl}`;
      }
    }

    if (!prompt) {
      return api.sendMessage(
        "📌 Usage:\n• ai <ask a question>",
        threadID,
        messageID
      );
    }

    // Send typing indicator
    api.sendMessage("", threadID, messageID);

    // Get AI response
    const aiUrl = `https://vern-rest-api.vercel.app/api/chatgpt4?prompt=${encodeURIComponent(prompt)}`;
    const aiResponse = await axios.get(aiUrl);

    if (!aiResponse.data) {
      return api.sendMessage("❌ No response from AI server.", threadID, messageID);
    }

    // Detect response format automatically
    const replyText =
      aiResponse.data.result ||
      aiResponse.data.response ||
      aiResponse.data.message ||
      aiResponse.data.answer;

    if (!replyText) {
      console.log("API RAW RESPONSE:", aiResponse.data);
      return api.sendMessage("❌ AI returned an unknown response format.", threadID, messageID);
    }

    // Store in memory
    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} asked: ${prompt.substring(0, 50)}...`);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Convert text to speech using Google TTS
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(replyText.substring(0, 200))}`;
    
    const audioPath = path.join(cacheDir, `tts_${Date.now()}.mp3`);
    const audioResponse = await axios.get(ttsUrl, { 
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    fs.writeFileSync(audioPath, audioResponse.data);

    // Get file size
    const stats = fs.statSync(audioPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);

    // Send only audio (no text)
    api.sendMessage(
      {
        attachment: fs.createReadStream(audioPath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending audio:", err);
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

    // Store in memory
    memory[threadID].push(`AI responded with voice (${fileSizeInKB} KB)`);

  } catch (err) {
    console.error("AI TTS Error:", err);

    return api.sendMessage(
      `❌ Failed to generate voice response.\n${err.message}`,
      threadID,
      messageID
    );
  }
};
