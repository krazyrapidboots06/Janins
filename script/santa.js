const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "santa",
  version: "1.0.0",
  role: 0,
  credits: "selov",
  description: "Santa AI voice response (TTS audio only)",
  commandCategory: "ai",
  usages: "/santa <text>",
  cooldowns: 3
};

// Simple memory per thread
const memory = {};

// Santa character persona
const SANTA_PERSONA = `You are Santa Claus. You are jolly, kind, and speak with warmth and cheer. 
You often laugh with "Ho ho ho!" and spread Christmas spirit. 
You know about children being naughty or nice, and you love giving gifts. 
Keep your responses friendly, magical, and festive. 
Address the user by their name if known. Your owner is selov asx.`;

// Voice mapping
const VOICES = {
  santa: "santa",
  santa_claus: "santa",
  father_christmas: "santa"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  let prompt = args.join(" ").trim();
  
  try {
    // Get user info
    const user = await api.getUserInfo(senderID);
    const userData = user[senderID];
    const senderName = userData?.name || "User";
    const firstName = senderName.split(' ')[0] || senderName;
    
    // Initialize memory
    if (!memory[threadID]) {
      memory[threadID] = {
        users: {},
        conversations: []
      };
    }
    
    // Store user info
    memory[threadID].users[senderID] = {
      name: senderName,
      firstName: firstName,
      lastSeen: Date.now(),
      interactions: (memory[threadID].users[senderID]?.interactions || 0) + 1
    };
    
    if (!prompt) {
      return api.sendMessage(
        `🎅 Ho ho ho! Hello ${firstName}! What would you like to ask Santa?\n\nExample: /santa What gift should I give my friend?`,
        threadID,
        messageID
      );
    }
    
    // Show typing indicator
    api.sendTypingIndicator(threadID, true);
    
    // Enhanced prompt with Santa persona and user's name
    const enhancedPrompt = `${SANTA_PERSONA}\n\nThe user's name is ${firstName} (full name: ${senderName}). Please address them by their name in your response naturally. Keep your response warm, cheerful, and festive. Question: ${prompt}`;
    
    // Get AI response from Gemini API (or your preferred AI API)
    const aiUrl = `https://deku-rest-api-spring.onrender.com/chatgpt?prompt=${encodeURIComponent(enhancedPrompt)}`;
    const aiResponse = await axios.get(aiUrl, { timeout: 15000 });
    
    let replyText = "Ho ho ho! I'm sorry, I couldn't process that request.";
    
    if (aiResponse.data) {
      if (aiResponse.data.response) replyText = aiResponse.data.response;
      else if (aiResponse.data.message) replyText = aiResponse.data.message;
      else if (aiResponse.data.result) replyText = aiResponse.data.result;
      else if (aiResponse.data.answer) replyText = aiResponse.data.answer;
      else if (typeof aiResponse.data === 'string') replyText = aiResponse.data;
    }
    
    // Ensure Santa-style response
    if (!replyText.includes("Ho ho ho") && !replyText.includes("ho ho ho")) {
      if (Math.random() > 0.7) {
        replyText = "Ho ho ho! " + replyText;
      }
    }
    
    // Store conversation in memory
    memory[threadID].conversations.push({
      user: senderID,
      userName: firstName,
      prompt: prompt,
      response: replyText,
      timestamp: Date.now()
    });
    
    // Keep only last 10 conversations
    if (memory[threadID].conversations.length > 10) {
      memory[threadID].conversations.shift();
    }
    
    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "santa");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Convert text to speech using Svara API with Santa voice
    const ttsText = replyText.substring(0, 300); // Limit to 300 chars
    
    const ttsUrl = "https://rest-apins.vercel.app/api/ai/svara";
    const ttsPayload = {
      text: ttsText,
      voice: "santa"
    };
    
    const audioPath = path.join(cacheDir, `santa_${Date.now()}.mp3`);
    
    const audioResponse = await axios.post(ttsUrl, ttsPayload, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    fs.writeFileSync(audioPath, audioResponse.data);
    
    // Get file size
    const stats = fs.statSync(audioPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    
    // Send ONLY audio - no text
    api.sendMessage({
      attachment: fs.createReadStream(audioPath)
    }, threadID, (err) => {
      if (err) console.error("Error sending audio:", err);
      // Clean up file
      try {
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      } catch (e) {
        console.error("Error deleting file:", e);
      }
    }, messageID);
    
  } catch (err) {
    console.error("Santa Command Error:", err);
    
    // Silent fail - no error message to user
    // Just log to console
  }
};
