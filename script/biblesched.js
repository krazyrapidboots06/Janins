const axios = require('axios');
const moment = require('moment-timezone');

module.exports.config = {
  name: "biblesched",
  version: "4.0.0",
  role: 2, // Admin only
  credits: "selov",
  description: "Send Bible verses to ALL groups (humility, lust, Mark 6:66)",
  commandCategory: "religion",
  usages: "/biblesched on/off/status",
  cooldowns: 5
};

// Store active schedule globally (for ALL groups)
let globalSchedule = {
  active: false,
  morningTimer: null,
  afternoonTimer: null,
  eveningTimer: null
};

// Store all thread IDs where bot is present
let allThreads = new Set();

// Bible verses database
const bibleVerses = {
  humility: [
    {
      verse: "Philippians 2:3-4",
      text: "Do nothing out of selfish ambition or vain conceit. Rather, in humility value others above yourselves, not looking to your own interests but each of you to the interests of the others."
    },
    {
      verse: "Proverbs 22:4",
      text: "Humility is the fear of the Lord; its wages are riches and honor and life."
    },
    {
      verse: "James 4:6",
      text: "But he gives us more grace. That is why Scripture says: 'God opposes the proud but shows favor to the humble.'"
    },
    {
      verse: "Micah 6:8",
      text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God."
    },
    {
      verse: "Matthew 23:12",
      text: "For those who exalt themselves will be humbled, and those who humble themselves will be exalted."
    }
  ],
  lust: [
    {
      verse: "1 Corinthians 6:18-20",
      text: "Flee from sexual immorality. All other sins a person commits are outside the body, but whoever sins sexually, sins against their own body. Do you not know that your bodies are temples of the Holy Spirit, who is in you, whom you have received from God? You are not your own; you were bought at a price. Therefore honor God with your bodies."
    },
    {
      verse: "Galatians 5:16",
      text: "So I say, walk by the Spirit, and you will not gratify the desires of the flesh."
    },
    {
      verse: "1 John 2:16",
      text: "For everything in the world—the lust of the flesh, the lust of the eyes, and the pride of life—comes not from the Father but from the world."
    },
    {
      verse: "Matthew 5:28",
      text: "But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart."
    },
    {
      verse: "Colossians 3:5",
      text: "Put to death, therefore, whatever belongs to your earthly nature: sexual immorality, impurity, lust, evil desires and greed, which is idolatry."
    }
  ],
  mark: [
    {
      verse: "Mark 6:66",
      text: "When they had crossed over, they landed at Gennesaret and anchored there."
    }
  ]
};

// Helper: Get random verse from category
function getRandomVerse(category) {
  const verses = bibleVerses[category];
  const randomIndex = Math.floor(Math.random() * verses.length);
  return verses[randomIndex];
}

// Helper: Format message
function formatMessage(verseData, categoryName) {
  return `📖 ${categoryName.toUpperCase()}\n━━━━━━━━━━━━━━━━\n📌 ${verseData.verse}\n\n"${verseData.text}"\n━━━━━━━━━━━━━━━━\n🙏 May this word bless your day!`;
}

// Send message to ALL groups
async function sendToAllGroups(api, message) {
  for (const threadID of allThreads) {
    try {
      await api.sendMessage(message, threadID);
      console.log(`Sent to group: ${threadID}`);
    } catch (err) {
      console.error(`Failed to send to ${threadID}:`, err.message);
    }
  }
}

// Get all threads where bot is present
async function updateAllThreads(api) {
  // This is a limitation - Facebook API doesn't have a direct "get all threads" method
  // We'll rely on the handleEvent to track threads
  console.log(`Currently tracking ${allThreads.size} threads`);
}

// Schedule the messages for ALL groups
function scheduleGlobalMessages(api) {
  const tz = 'Asia/Manila';
  
  // Clear existing timers
  if (globalSchedule.morningTimer) clearTimeout(globalSchedule.morningTimer);
  if (globalSchedule.afternoonTimer) clearTimeout(globalSchedule.afternoonTimer);
  if (globalSchedule.eveningTimer) clearTimeout(globalSchedule.eveningTimer);
  
  // Morning: 6:00 AM
  const morningTime = moment.tz(tz).set({ hour: 6, minute: 0, second: 0 });
  let morningDelay = morningTime.diff(moment.tz(tz));
  if (morningDelay < 0) morningDelay += 24 * 60 * 60 * 1000;
  
  // Afternoon: 12:15 PM
  const afternoonTime = moment.tz(tz).set({ hour: 12, minute: 55, second: 0 });
  let afternoonDelay = afternoonTime.diff(moment.tz(tz));
  if (afternoonDelay < 0) afternoonDelay += 24 * 60 * 60 * 1000;
  
  // Evening: 6:00 PM
  const eveningTime = moment.tz(tz).set({ hour: 18, minute: 0, second: 0 });
  let eveningDelay = eveningTime.diff(moment.tz(tz));
  if (eveningDelay < 0) eveningDelay += 24 * 60 * 60 * 1000;
  
  // Morning schedule
  globalSchedule.morningTimer = setTimeout(async () => {
    try {
      const verse = getRandomVerse('humility');
      const message = formatMessage(verse, 'Humility');
      await sendToAllGroups(api, message);
      // Reschedule for next day
      scheduleGlobalMessages(api);
    } catch (err) {
      console.error("Morning message error:", err);
    }
  }, morningDelay);
  
  // Afternoon schedule
  globalSchedule.afternoonTimer = setTimeout(async () => {
    try {
      const verse = getRandomVerse('lust');
      const message = formatMessage(verse, 'Lust');
      await sendToAllGroups(api, message);
    } catch (err) {
      console.error("Afternoon message error:", err);
    }
  }, afternoonDelay);
  
  // Evening schedule (Mark 6:66)
  globalSchedule.eveningTimer = setTimeout(async () => {
    try {
      const verse = bibleVerses.mark[0];
      const message = formatMessage(verse, 'Mark 6:66');
      await sendToAllGroups(api, message);
    } catch (err) {
      console.error("Evening message error:", err);
    }
  }, eveningDelay);
  
  console.log("Global schedule activated");
}

// Cancel global schedule
function cancelGlobalSchedule() {
  if (globalSchedule.morningTimer) clearTimeout(globalSchedule.morningTimer);
  if (globalSchedule.afternoonTimer) clearTimeout(globalSchedule.afternoonTimer);
  if (globalSchedule.eveningTimer) clearTimeout(globalSchedule.eveningTimer);
  globalSchedule.active = false;
  console.log("Global schedule deactivated");
}

// Track threads when bot receives messages or joins groups
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, logMessageType } = event;
  
  // Add thread to set when bot receives a message
  if (event.isGroup && threadID) {
    allThreads.add(threadID);
    console.log(`Added thread: ${threadID} (Total: ${allThreads.size})`);
  }
  
  // When bot joins a new group
  if (logMessageType === "log:subscribe") {
    const addedParticipants = event.logMessageData?.addedParticipants || [];
    const botID = api.getCurrentUserID();
    
    const botAdded = addedParticipants.some(p => p.userFbId === botID);
    
    if (botAdded) {
      allThreads.add(threadID);
      console.log(`Bot added to group ${threadID}, added to tracking (Total: ${allThreads.size})`);
      
      // If schedule is active, send welcome message
      if (globalSchedule.active) {
        setTimeout(async () => {
          try {
            const tz = 'Asia/Manila';
            const morning = moment.tz(tz).set({ hour: 6, minute: 0 }).format('hh:mm A');
            const afternoon = moment.tz(tz).set({ hour: 12, minute: 55 }).format('hh:mm A');
            const evening = moment.tz(tz).set({ hour: 18, minute: 0 }).format('hh:mm A');
            
            await api.sendMessage(
              `📖 Bible Schedule Active\n━━━━━━━━━━━━━━━━\n` +
              `🌅 Morning (${morning}): Humility\n` +
              `☀️ Afternoon (${afternoon}): Lust\n` +
              `🌙 Evening (${evening}): Mark 6:66\n` +
              `━━━━━━━━━━━━━━━━\n` +
              `Daily Bible verses will be sent to ALL groups.`,
              threadID
            );
          } catch (err) {
            console.error("Welcome message error:", err);
          }
        }, 3000);
      }
    }
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const command = args[0]?.toLowerCase();
  
  try {
    // Admin UIDs for manual control
    const adminUIDs = ["61556388598622", "61552057602849"];
    
    if (!adminUIDs.includes(senderID)) {
      return api.sendMessage("❌ This command is for admins only.", threadID, messageID);
    }
    
    if (command === "on") {
      if (globalSchedule.active) {
        return api.sendMessage("✅ Bible schedule is already active for ALL groups.", threadID, messageID);
      }
      
      // Update thread list
      await updateAllThreads(api);
      
      // Activate global schedule
      globalSchedule.active = true;
      scheduleGlobalMessages(api);
      
      const tz = 'Asia/Manila';
      const morning = moment.tz(tz).set({ hour: 6, minute: 0 }).format('hh:mm A');
      const afternoon = moment.tz(tz).set({ hour: 12, minute: 55 }).format('hh:mm A');
      const evening = moment.tz(tz).set({ hour: 18, minute: 0 }).format('hh:mm A');
      
      return api.sendMessage(
        `📖 Bible Schedule Activated (GLOBAL)\n━━━━━━━━━━━━━━━━\n` +
        `🌅 Morning (${morning}): Humility\n` +
        `☀️ Afternoon (${afternoon}): Lust\n` +
        `🌙 Evening (${evening}): Mark 6:66\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `✅ Sending to ALL ${allThreads.size} groups.\n\n` +
        `New groups added automatically will also receive verses.`,
        threadID,
        messageID
      );
      
    } else if (command === "off") {
      if (!globalSchedule.active) {
        return api.sendMessage("❌ Bible schedule is not active.", threadID, messageID);
      }
      
      cancelGlobalSchedule();
      return api.sendMessage("✅ Bible schedule has been turned off for ALL groups.", threadID, messageID);
      
    } else if (command === "status") {
      const tz = 'Asia/Manila';
      const morning = moment.tz(tz).set({ hour: 6, minute: 0 }).format('hh:mm A');
      const afternoon = moment.tz(tz).set({ hour: 12, minute: 55 }).format('hh:mm A');
      const evening = moment.tz(tz).set({ hour: 18, minute: 0 }).format('hh:mm A');
      
      return api.sendMessage(
        `📖 **Bible Schedule Status**\n━━━━━━━━━━━━━━━━\n` +
        `✅ **Active:** ${globalSchedule.active ? 'Yes' : 'No'}\n` +
        `📊 **Groups:** ${allThreads.size} groups\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `🌅 **Morning (${morning}):** Humility\n` +
        `☀️ **Afternoon (${afternoon}):** Lust\n` +
        `🌙 **Evening (${evening}):** Mark 6:66\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `${globalSchedule.active ? 'Daily verses are being sent to ALL groups.' : 'Use /biblesched on to activate.'}`,
        threadID,
        messageID
      );
      
    } else {
      return api.sendMessage(
        `📖 Bible Schedule Command\n━━━━━━━━━━━━━━━━\n` +
        `• /biblesched on - Activate for ALL groups\n` +
        `• /biblesched off - Deactivate for ALL groups\n` +
        `• /biblesched status - Check current status\n\n` +
        `Schedule (Philippines Time):*\n` +
        `🌅 6:00 AM - Humility\n` +
        `☀️ 12:15 PM - Lust\n` +
        `🌙 6:00 PM - Mark 6:66\n\n` +
        `⚠️ When activated, verses are sent to ALL groups where bot is present!`,
        threadID,
        messageID
      );
    }
    
  } catch (err) {
    console.error("Bible Schedule Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
