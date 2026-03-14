const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "ai",
  version: "9.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "AI with normal boy voice response",
  commandCategory: "search",
  usages: "/ai <text>",
  cooldowns: 3
};

// Simple memory per thread with user profiles
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // Join all args to get the full prompt
  let prompt = args.join(" ").trim();
  
  try {
    // Get user info
    const user = await api.getUserInfo(senderID);
    const userData = user[senderID];
    const senderName = userData?.name || "User";
    const firstName = senderName.split(' ')[0] || senderName;

    // Check if prompt is empty
    if (!prompt) {
      return api.sendMessage(
        `❌ Please ask a question.\n\nExample: /ai what is your name?`,
        threadID,
        messageID
      );
    }

    // Send typing indicator
    api.sendTypingIndicator(threadID, true);

    // Get AI response from ChatGPT API
    const aiUrl = `https://deku-rest-api-spring.onrender.com/chatgpt?prompt=${encodeURIComponent(prompt)}`;
    
    const aiResponse = await axios.get(aiUrl);
    
    let replyText = "I'm sorry, I couldn't process that request.";
    
    if (aiResponse.data && aiResponse.data.response) {
      replyText = aiResponse.data.response;
    } else if (aiResponse.data && aiResponse.data.message) {
      replyText = aiResponse.data.message;
    } else if (aiResponse.data && aiResponse.data.result) {
      replyText = aiResponse.data.result;
    }

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Convert text to speech using Google TTS (most reliable)
    const ttsText = encodeURIComponent(replyText.substring(0, 200));
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${ttsText}`;
    
    const audioPath = path.join(cacheDir, `tts_${Date.now()}.mp3`);
    const audioResponse = await axios.get(ttsUrl, { 
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    fs.writeFileSync(audioPath, audioResponse.data);

    // Send ONLY audio
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

  } catch (err) {
    console.error("AI TTS Error:", err);
    // Send error message so user knows something went wrong
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
