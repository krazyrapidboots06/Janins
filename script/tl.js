const axios = require('axios');

module.exports.config = {
  name: "translate",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Translate text between languages",
  commandCategory: "utility",
  usages: "/translate [text] [source] to [target] OR reply to a message with /translate [source] to [target]",
  cooldowns: 2
};

// Language codes mapping (common languages)
const languageCodes = {
  // Major world languages
  "english": "en", "en": "en",
  "spanish": "es", "es": "es",
  "french": "fr", "fr": "fr", 
  "german": "de", "de": "de",
  "italian": "it", "it": "it",
  "portuguese": "pt", "pt": "pt",
  "russian": "ru", "ru": "ru",
  "japanese": "ja", "ja": "ja",
  "korean": "ko", "ko": "ko",
  "chinese": "zh", "zh": "zh", "mandarin": "zh",
  "arabic": "ar", "ar": "ar",
  "hindi": "hi", "hi": "hi",
  "bengali": "bn", "bn": "bn",
  
  // Philippine languages
  "tagalog": "tl", "tl": "tl", "filipino": "tl",
  "cebuano": "ceb", "ceb": "ceb", "bisaya": "ceb",
  "ilocano": "ilo", "ilo": "ilo",
  "hiligaynon": "hil", "hil": "hil",
  
  // Southeast Asian
  "thai": "th", "th": "th",
  "vietnamese": "vi", "vi": "vi",
  "indonesian": "id", "id": "id",
  "malay": "ms", "ms": "ms",
  
  // European
  "dutch": "nl", "nl": "nl",
  "swedish": "sv", "sv": "sv",
  "norwegian": "no", "no": "no",
  "danish": "da", "da": "da",
  "finnish": "fi", "fi": "fi",
  "polish": "pl", "pl": "pl",
  "czech": "cs", "cs": "cs",
  "hungarian": "hu", "hu": "hu",
  "greek": "el", "el": "el",
  "turkish": "tr", "tr": "tr",
  "hebrew": "he", "he": "he",
  
  // Default/auto-detect
  "auto": "auto", "autodetect": "auto"
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, type, messageReply } = event;
  
  try {
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";
    
    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];
    
    let textToTranslate = "";
    let sourceLang = "auto";
    let targetLang = "en"; // Default target is English
    
    // CASE 1: User replied to a message with /translate [source] to [target]
    if (type === "message_reply" && messageReply && messageReply.body) {
      // Get the text from the replied message
      textToTranslate = messageReply.body;
      
      // Parse arguments for language specification
      const argsString = args.join(" ").toLowerCase();
      
      // Check for format like "en to tl" or "english to tagalog"
      const toMatch = argsString.match(/(\w+)\s+to\s+(\w+)/);
      
      if (toMatch) {
        // Format: /translate en to tl (using replied message)
        const sourceInput = toMatch[1];
        const targetInput = toMatch[2];
        
        sourceLang = languageCodes[sourceInput] || sourceInput;
        targetLang = languageCodes[targetInput] || targetInput;
      } else if (argsString) {
        // Just a single language specified (target only)
        targetLang = languageCodes[argsString] || argsString;
      }
      // else use defaults (auto to en)
    }
    // CASE 2: User typed /translate eat en to tl (text included)
    else {
      // Join all args to parse
      const fullText = args.join(" ");
      
      // Check for format with "to"
      const toMatch = fullText.match(/(.+?)\s+(\w+)\s+to\s+(\w+)/i);
      
      if (toMatch) {
        // Format: /translate hello world en to tl
        textToTranslate = toMatch[1].trim();
        const sourceInput = toMatch[2].toLowerCase();
        const targetInput = toMatch[3].toLowerCase();
        
        sourceLang = languageCodes[sourceInput] || sourceInput;
        targetLang = languageCodes[targetInput] || targetInput;
      } else {
        // No "to" pattern found, assume it's just text to translate to English
        textToTranslate = fullText;
        // Keep defaults: sourceLang = "auto", targetLang = "en"
      }
    }
    
    // Validate we have text to translate
    if (!textToTranslate) {
      return api.sendMessage(
        "📝 **TRANSLATE COMMAND USAGE**\n━━━━━━━━━━━━━━━━\n" +
        "**Option 1 - Reply to a message:**\n" +
        "• /translate [source] to [target] (replied to a message)\n" +
        "• Example: Reply to a message with: /translate en to tl\n" +
        "• Example: Reply with: /translate spanish to tagalog\n\n" +
        "**Option 2 - Include text:**\n" +
        "• /translate [text] [source] to [target]\n" +
        "• Example: /translate Hello World en to tl\n" +
        "• Example: /translate Kumusta ka tl to en\n\n" +
        "**Supported languages:** English, Tagalog, Cebuano, Spanish, French, Japanese, Korean, Chinese, and 30+ more!",
        threadID,
        messageID
      );
    }
    
    // Send "translating" message
    const waitingMsg = await api.sendMessage(
      `🔄 Translating...\n\n📝 "${textToTranslate.substring(0, 50)}${textToTranslate.length > 50 ? '...' : ''}"`,
      threadID
    );
    
    // Call the translation API (using MyMemory - free, no key needed for basic use)
    const apiUrl = `https://api.mymemory.translated.net/get`;
    const response = await axios.get(apiUrl, {
      params: {
        q: textToTranslate,
        langpair: `${sourceLang}|${targetLang}`,
        de: "a@b.c" // Optional email to get higher limits
      },
      timeout: 10000
    });
    
    const data = response.data;
    
    if (!data || !data.responseData || !data.responseData.translatedText) {
      throw new Error("Translation failed");
    }
    
    const translatedText = data.responseData.translatedText;
    const matchQuality = data.responseData.match || 0;
    const sourceDetected = data.responseData.detectedLanguage || sourceLang;
    
    // Get language names for display
    const sourceName = getLanguageName(sourceDetected);
    const targetName = getLanguageName(targetLang);
    
    // Store in memory
    memory[threadID].push(`${senderName} translated text from ${sourceName} to ${targetName}`);
    
    // Prepare response
    const replyMsg = 
      `🌐 **TRANSLATION RESULT**\n━━━━━━━━━━━━━━━━\n` +
      `**From:** ${sourceName} ${sourceLang !== 'auto' ? `(${sourceLang})` : '(auto-detected)'}\n` +
      `**To:** ${targetName} (${targetLang})\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `**Original:**\n"${textToTranslate}"\n\n` +
      `**Translation:**\n"${translatedText}"\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `⚡ Confidence: ${Math.round(matchQuality * 100)}%\n` +
      `💬 Requested by: ${senderName}`;
    
    // Delete waiting message and send result
    await api.unsendMessage(waitingMsg.messageID);
    api.sendMessage(replyMsg, threadID, messageID);
    
  } catch (err) {
    console.error("Translate Command Error:", err);
    
    // Provide helpful error message
    let errorMsg = "❌ Translation failed. ";
    
    if (err.message.includes("timedout") || err.code === 'ECONNABORTED') {
      errorMsg += "The request timed out. Please try again.";
    } else if (err.response && err.response.status === 429) {
      errorMsg += "Rate limit exceeded. Please wait a moment and try again.";
    } else {
      errorMsg += "Please check your language codes and try again.\n\n" +
                  "**Common codes:** en (English), tl (Tagalog), ceb (Cebuano), es (Spanish), fr (French), ja (Japanese), ko (Korean), zh (Chinese)";
    }
    
    api.sendMessage(errorMsg, threadID, messageID);
  }
};

// Helper function to get language name from code
function getLanguageName(code) {
  const languageMap = {
    "en": "English",
    "tl": "Tagalog",
    "ceb": "Cebuano",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "bn": "Bengali",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "ms": "Malay",
    "nl": "Dutch",
    "sv": "Swedish",
    "no": "Norwegian",
    "da": "Danish",
    "fi": "Finnish",
    "pl": "Polish",
    "cs": "Czech",
    "hu": "Hungarian",
    "el": "Greek",
    "tr": "Turkish",
    "he": "Hebrew",
    "ilo": "Ilocano",
    "hil": "Hiligaynon",
    "auto": "Auto-detected"
  };
  
  return languageMap[code] || code.toUpperCase();
}
