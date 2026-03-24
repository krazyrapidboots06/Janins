const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "santa",
  version: "7.0.0",
  role: 0,
  credits: "selov",
  description: "Santa voice TTS (audio only)",
  commandCategory: "ai",
  usages: "/santa <text>",
  cooldowns: 3
};

// VoiceRSS API Key
const VOICE_RSS_KEY = "35bfa5b8240b40caa734948a13d0f2fe";

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  let text = args.join(" ").trim();
  
  if (!text) {
    return api.sendMessage(
      `🎅 Ho ho ho! What would you like Santa to say?\n\nExample: /santa Merry Christmas everyone!`,
      threadID,
      messageID
    );
  }
  
  try {
    // Show typing indicator
    api.sendTypingIndicator(threadID, true);
    
    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "santa");
    await fs.ensureDir(cacheDir);
    
    // Convert text to speech using VoiceRSS with male voice
    const ttsText = encodeURIComponent(text);
    
    // Try different male voices in order
    const voices = ['Adam', 'Brian', 'en-us', 'en-uk'];
    let audioData = null;
    let usedVoice = null;
    
    for (const voice of voices) {
      try {
        let ttsUrl;
        
        if (voice === 'Adam' || voice === 'Brian') {
          // StreamElements API - no key needed, Adam and Brian are male voices
          ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${ttsText}`;
        } else {
          // VoiceRSS API - male voices
          ttsUrl = `https://api.voicerss.org/?key=${VOICE_RSS_KEY}&hl=${voice}&src=${ttsText}&c=MP3`;
        }
        
        const response = await axios.get(ttsUrl, {
          responseType: "arraybuffer",
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.data && response.data.length > 1000) {
          audioData = response.data;
          usedVoice = voice;
          break;
        }
      } catch (e) {
        console.log(`${voice} failed, trying next...`);
      }
    }
    
    if (!audioData) {
      // Last resort: Google TTS
      const googleTts = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${ttsText}`;
      const response = await axios.get(googleTts, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'http://translate.google.com/'
        }
      });
      audioData = response.data;
      usedVoice = "Google TTS";
    }
    
    if (!audioData || audioData.length < 1000) {
      throw new Error("Failed to generate audio");
    }
    
    const audioPath = path.join(cacheDir, `santa_${Date.now()}.mp3`);
    fs.writeFileSync(audioPath, audioData);
    
    // Send ONLY audio
    api.sendMessage({
      attachment: fs.createReadStream(audioPath)
    }, threadID, () => {
      // Clean up file after sending
      setTimeout(() => {
        try {
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
        } catch (e) {}
      }, 5000);
    }, messageID);
    
  } catch (err) {
    console.error("Santa TTS Error:", err);
    // Silent fail - no error to user
  }
};
