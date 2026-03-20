const biblegateway = require("biblegateway-scrape");
const moment = require("moment-timezone");

module.exports.config = {
  name: "bible",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Get Bible verses in Tagalog, Cebuano, or English",
  commandCategory: "religion",
  usages: "/bible [tagalog|cebuano|english] [verse] or /bible daily [tagalog|cebuano|english]",
  cooldowns: 2
};

// Simple memory per thread
const memory = {};

// Available versions for each language
const versions = {
  tagalog: {
    name: "Tagalog (Ang Dating Biblia 1905)",
    code: biblegateway.version.TAG_ANG_DATING_BIBLIYA_1905,
    daily: biblegateway.version.TAG_ANG_DATING_BIBLIYA_1905,
    flag: "🇵🇭",
    displayName: "Tagalog"
  },
  cebuano: {
    name: "Cebuano (Ang Pulong sa Dios)",
    code: biblegateway.version.CEB_ANG_PULONG_SA_DIOS,
    daily: biblegateway.version.CEB_ANG_PULONG_SA_DIOS,
    flag: "🇵🇭",
    displayName: "Cebuano"
  },
  english: {
    name: "English (King James Version)",
    code: biblegateway.version.ENG_KING_JAMES_VERSION,
    daily: biblegateway.version.ENG_KING_JAMES_VERSION,
    flag: "🇬🇧",
    displayName: "English"
  }
};

// Additional English versions you can use
const englishVersions = {
  kjv: biblegateway.version.ENG_KING_JAMES_VERSION,
  nkjv: biblegateway.version.ENG_NEW_KING_JAMES_VERSION,
  niv: biblegateway.version.ENG_NEW_INTERNATIONAL_VERSION,
  esv: biblegateway.version.ENG_ENLISH_STANDARD_VERSION,
  nasb: biblegateway.version.ENG_NEW_AMERICAN_STANDARD_BIBLE,
  msg: biblegateway.version.ENG_THE_MESSAGE,
  amp: biblegateway.version.ENG_AMPLIFIED_BIBLE
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  try {
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";
    
    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];
    
    // Parse arguments
    let language = "tagalog"; // default
    let verse = "";
    let isDaily = false;
    let englishVersion = "kjv"; // default English version
    
    if (args.length === 0) {
      return api.sendMessage(
        "📖 **BIBLE COMMAND USAGE**\n" +
        "━━━━━━━━━━━━━━━━\n" +
        "🇵🇭 **Tagalog:** /bible tagalog Juan 3:16\n" +
        "🇵🇭 **Cebuano:** /bible cebuano Juan 3:16\n" +
        "🇬🇧 **English:** /bible english John 3:16\n" +
        "━━━━━━━━━━━━━━━━\n" +
        "📅 **Daily Verses:**\n" +
        "• /bible daily tagalog\n" +
        "• /bible daily cebuano\n" +
        "• /bible daily english\n" +
        "━━━━━━━━━━━━━━━━\n" +
        "📘 **English Versions:**\n" +
        "• /bible english kjv John 3:16 (King James)\n" +
        "• /bible english niv John 3:16 (NIV)\n" +
        "• /bible english esv John 3:16 (ESV)\n" +
        "• /bible english nkjv John 3:16 (NKJV)",
        threadID,
        messageID
      );
    }
    
    // Check for daily verse
    if (args[0].toLowerCase() === "daily") {
      isDaily = true;
      language = args[1]?.toLowerCase() || "tagalog";
      if (!versions[language]) language = "tagalog";
    } 
    // Check for language with optional version
    else if (args[0].toLowerCase() === "tagalog" || 
             args[0].toLowerCase() === "cebuano" || 
             args[0].toLowerCase() === "english") {
      
      language = args[0].toLowerCase();
      
      // For English, check if they specified a version
      if (language === "english" && args[1] && englishVersions[args[1].toLowerCase()]) {
        englishVersion = args[1].toLowerCase();
        verse = args.slice(2).join(" ");
      } else {
        verse = args.slice(1).join(" ");
      }
    } 
    // Default to tagalog
    else {
      verse = args.join(" ");
    }
    
    // Validate verse for non-daily requests
    if (!isDaily && !verse) {
      return api.sendMessage(
        `❌ Please provide a verse reference.\n` +
        `Example: /bible ${language} ${language === 'english' ? 'John 3:16' : 'Juan 3:16'}`,
        threadID,
        messageID
      );
    }
    
    // Get version info
    let versionInfo;
    if (language === "english" && englishVersion !== "kjv") {
      // Use custom English version
      versionInfo = {
        name: `English (${englishVersion.toUpperCase()})`,
        code: englishVersions[englishVersion],
        flag: "🇬🇧",
        displayName: "English"
      };
    } else {
      versionInfo = versions[language];
    }
    
    memory[threadID].push(`${senderName} requested ${isDaily ? 'daily' : verse} in ${language}`);
    
    // Send loading message
    const waitingMsg = await api.sendMessage(
      `📖 Fetching ${isDaily ? 'daily verse' : `"${verse}"`} in ${versionInfo.displayName}...`,
      threadID
    );
    
    let result;
    
    if (isDaily) {
      // Get daily verse with current date
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      try {
        result = await biblegateway.dailyVerse(versionInfo.daily, [year, month, day]);
      } catch (e) {
        // Try without date if error
        result = await biblegateway.dailyVerse(versionInfo.daily);
      }
      
      if (!result || !result.verse) {
        return api.editMessage("❌ Could not fetch daily verse.", waitingMsg.messageID);
      }
      
      // Format daily verse response
      const verseRef = result.reference || result.verse_ref || "Daily Verse";
      const verseText = result.verse || result.content || "No verse text available";
      
      // Language-specific titles
      const titles = {
        tagalog: "Pang-araw-araw na Talata",
        cebuano: "Adlaw-adlaw nga Bersikulo",
        english: "Daily Verse"
      };
      
      const reply = 
        `📖 **${versionInfo.flag} ${titles[language]}**\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `📅 ${moment().tz("Asia/Manila").format("MMMM D, YYYY")}\n` +
        `📌 ${verseRef}\n\n` +
        `"${verseText}"\n\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `📚 ${versionInfo.name}\n` +
        `💬 Requested by: ${senderName}`;
      
      await api.editMessage(reply, waitingMsg.messageID);
      memory[threadID].push(`Daily verse in ${language}`);
      
    } else {
      // Get specific verse
      result = await biblegateway.verse(verse, versionInfo.code);
      
      if (!result || result.length === 0) {
        return api.editMessage(
          `❌ Verse not found. Please check the reference format.\n` +
          `Example: /bible ${language} ${language === 'english' ? 'John 3:16' : 'Juan 3:16'}`,
          waitingMsg.messageID
        );
      }
      
      const verseData = result[0];
      const verseRef = verseData.book || verseData.reference || verse;
      const verseText = verseData.verse || verseData.content || "No verse text available";
      
      const reply = 
        `📖 **${versionInfo.flag} BIBLE VERSE**\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `📌 ${verseRef}\n\n` +
        `"${verseText}"\n\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `📚 ${versionInfo.name}\n` +
        `💬 Requested by: ${senderName}`;
      
      await api.editMessage(reply, waitingMsg.messageID);
      memory[threadID].push(`Bible: ${verseRef} in ${language}`);
    }
    
  } catch (err) {
    console.error("Bible Command Error:", err);
    
    let errorMsg = `❌ Error: ${err.message}`;
    if (err.message.includes("Cannot read property")) {
      errorMsg = "❌ Failed to fetch Bible verse. Please try again later or check your reference format.";
    }
    
    api.sendMessage(errorMsg, threadID, messageID);
  }
};
