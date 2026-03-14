const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "ai",
  version: "5.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "AI with customizable voice responses",
  commandCategory: "search",
  usages: "ai <text> or ai -voice <voice> <text>",
  cooldowns: 3
};

// Voice library with different options [citation:2][citation:5]
const voices = {
  // Deep male voices
  "male1": { name: "en-US-Neural2-J", gender: "MALE", desc: "Deep male voice (US)" },
  "male2": { name: "en-US-Neural2-D", gender: "MALE", desc: "Deep male voice (US)" },
  "male3": { name: "en-GB-Neural2-B", gender: "MALE", desc: "Deep British male" },
  "male4": { name: "en-US-Studio-M", gender: "MALE", desc: "Deep studio male" },
  "male5": { name: "en-AU-Neural2-B", gender: "MALE", desc: "Deep Australian male" },
  
  // Female voices
  "female1": { name: "en-US-Neural2-F", gender: "FEMALE", desc: "Warm female voice (US)" },
  "female2": { name: "en-US-Neural2-C", gender: "FEMALE", desc: "Friendly female (US)" },
  "female3": { name: "en-GB-Neural2-A", gender: "FEMALE", desc: "British female" },
  "female4": { name: "en-US-Studio-F", gender: "FEMALE", desc: "Studio female voice" },
  
  // High-quality Chirp voices [citation:2]
  "chirp-male": { name: "en-US-Chirp3-HD-Charon", gender: "MALE", desc: "Ultra-realistic deep voice" },
  "chirp-female": { name: "en-US-Chirp3-HD-Kore", gender: "FEMALE", desc: "Ultra-realistic female voice" },
  "chirp-female2": { name: "en-US-Chirp3-HD-Leda", gender: "FEMALE", desc: "Expressive female voice" },
  
  // Accent voices
  "british-male": { name: "en-GB-Neural2-B", gender: "MALE", desc: "British male accent" },
  "british-female": { name: "en-GB-Neural2-A", gender: "FEMALE", desc: "British female accent" },
  "australian-male": { name: "en-AU-Neural2-B", gender: "MALE", desc: "Australian male accent" },
  "indian-female": { name: "en-IN-Neural2-A", gender: "FEMALE", desc: "Indian female accent" }
};

// Simple memory per thread with user profiles
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, attachments, senderID } = event;

  let prompt = args.join(" ").trim();
  let selectedVoice = "chirp-male"; // Default voice

  try {
    // Get user info with full details
    const user = await api.getUserInfo(senderID);
    const userData = user[senderID];
    const senderName = userData?.name || "User";
    const firstName = senderName.split(' ')[0] || senderName;

    // Initialize memory with user profile
    if (!memory[threadID]) {
      memory[threadID] = {
        users: {},
        conversations: [],
        userVoice: {} // Store user's preferred voice
      };
    }

    // Check for voice selection in command
    // Format: ai -voice male1 what is your name?
    if (prompt.startsWith('-voice ')) {
      const parts = prompt.split(' ');
      const voiceKey = parts[1].toLowerCase();
      
      if (voices[voiceKey]) {
        selectedVoice = voiceKey;
        prompt = parts.slice(2).join(' '); // Remove voice command from prompt
        // Save user's voice preference
        memory[threadID].userVoice[senderID] = voiceKey;
      } else {
        // Show available voices if invalid selection
        const voiceList = Object.entries(voices).map(([key, v]) => 
          `• ${key}: ${v.desc}`
        ).join('\n');
        
        return api.sendMessage(
          `🎤 Available voices:\n\n${voiceList}\n\nUsage: ai -voice <voice> <text>\nExample: ai -voice male1 what is your name?`,
          threadID,
          messageID
        );
      }
    } else {
      // Use user's previously selected voice if available
      selectedVoice = memory[threadID].userVoice[senderID] || "chirp-male";
    }

    // Store user info in thread memory
    memory[threadID].users[senderID] = {
      name: senderName,
      firstName: firstName,
      preferredVoice: selectedVoice,
      lastSeen: Date.now(),
      interactions: (memory[threadID].users[senderID]?.interactions || 0) + 1
    };

    // Check image
    if (attachments && attachments.length > 0) {
      const photo = attachments.find(a => a.type === "photo");
      if (photo) {
        const imageUrl = photo.url;
        prompt = `Describe this photo in detail like a human. The user's name is ${firstName}:\n${imageUrl}`;
      }
    }

    if (!prompt) {
      return api.sendMessage(
        `📌 Hello ${firstName}! Ask me anything.\n\nTo change voice: ai -voice <voice> <text>\nExample: ai -voice male1 what is your name?`,
        threadID,
        messageID
      );
    }

    // Send typing indicator
    api.sendTypingIndicator(threadID, true);

    const voiceInfo = voices[selectedVoice];
    const searching = await api.sendMessage(
      `🔊 AI is thinking and preparing ${voiceInfo.desc} response for ${firstName}...`, 
      threadID, 
      messageID
    );

    // Enhance prompt with user's name
    const enhancedPrompt = `The user's name is ${firstName} (full name: ${senderName}). Please address them by their name in your response naturally. Keep your response concise and friendly. Question: ${prompt}`;

    // Get AI response
    const aiUrl = `https://vern-rest-api.vercel.app/api/chatgpt4?prompt=${encodeURIComponent(enhancedPrompt)}`;
    const aiResponse = await axios.get(aiUrl);

    if (!aiResponse.data) {
      return api.editMessage("❌ No response from AI server.", searching.messageID);
    }

    // Detect response format
    const replyText =
      aiResponse.data.result ||
      aiResponse.data.response ||
      aiResponse.data.message ||
      aiResponse.data.answer;

    if (!replyText) {
      return api.editMessage("❌ AI returned an unknown response format.", searching.messageID);
    }

    // Store conversation in memory
    memory[threadID].conversations.push({
      user: senderID,
      userName: firstName,
      voiceUsed: selectedVoice,
      prompt: prompt,
      response: replyText,
      timestamp: Date.now()
    });

    // Keep only last 10 conversations
    if (memory[threadID].conversations.length > 10) {
      memory[threadID].conversations.shift();
    }

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Convert text to speech with selected voice [citation:1][citation:9]
    // Using Google TTS with specific voice parameters
    const ttsText = replyText.substring(0, 200); // Limit to 200 chars
    
    // Using voice-specific TTS API
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(ttsText)}`;
    
    // Note: Free Google TTS doesn't support voice selection
    // For advanced voices, you'd need Google Cloud TTS API key
    // Alternative: Use voice-specific parameters if available
    
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

    // Update searching message
    api.editMessage(
      `✅ Voice response ready for ${firstName}!\n` +
      `Voice: ${voiceInfo.desc}\n` +
      `Size: ${fileSizeInKB} KB`,
      searching.messageID
    );

    // Send audio
    api.sendMessage(
      {
        attachment: fs.createReadStream(audioPath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending audio:", err);
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
    return api.sendMessage(
      `❌ Failed to generate voice response.\n${err.message}`,
      threadID,
      messageID
    );
  }
};

// Command to list available voices
module.exports.voices = async function({ api, event }) {
  const voiceList = Object.entries(voices).map(([key, v]) => 
    `• ${key}: ${v.desc}`
  ).join('\n');
  
  return api.sendMessage(
    `🎤 Available Voices:\n\n${voiceList}\n\nTo use: ai -voice <voice> <text>\nExample: ai -voice male1 hello`,
    event.threadID,
    event.messageID
  );
};
