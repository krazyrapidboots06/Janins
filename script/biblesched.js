"use strict";

const moment = require("moment-timezone");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📖 BIBLE VERSE COLLECTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const bibleVerses = {
  morning: [
    {
      verse: "Flee from sexual immorality. Every other sin a person commits is outside the body, but the sexually immoral person sins against his own body.",
      ref: "1 Corinthians 6:18",
      topic: "🔥 Against Lustful Sins"
    },
    {
      verse: "But I say to you that everyone who looks at a woman with lustful intent has already committed adultery with her in his heart.",
      ref: "Matthew 5:28",
      topic: "🔥 Against Lustful Sins"
    },
    {
      verse: "Put to death therefore what is earthly in you: sexual immorality, impurity, passion, evil desire, and covetousness, which is idolatry.",
      ref: "Colossians 3:5",
      topic: "🔥 Against Lustful Sins"
    },
    {
      verse: "For everything in the world — the lust of the flesh, the lust of the eyes, and the pride of life — comes not from the Father but from the world.",
      ref: "1 John 2:16",
      topic: "🔥 Against Lustful Sins"
    },
    {
      verse: "So flee youthful passions and pursue righteousness, faith, love, and peace, along with those who call on the Lord from a pure heart.",
      ref: "2 Timothy 2:22",
      topic: "🔥 Against Lustful Sins"
    }
  ],

  afternoon: [
    {
      verse: "Humble yourselves before the Lord, and he will exalt you.",
      ref: "James 4:10",
      topic: "🙏 Being Humble"
    },
    {
      verse: "Do nothing from selfish ambition or conceit, but in humility count others more significant than yourselves.",
      ref: "Philippians 2:3",
      topic: "🙏 Being Humble"
    },
    {
      verse: "God opposes the proud but gives grace to the humble.",
      ref: "James 4:6",
      topic: "🙏 Being Humble"
    },
    {
      verse: "Whoever exalts himself will be humbled, and whoever humbles himself will be exalted.",
      ref: "Matthew 23:12",
      topic: "🙏 Being Humble"
    },
    {
      verse: "Walk humbly with your God.",
      ref: "Micah 6:8",
      topic: "🙏 Being Humble"
    },
    {
      verse: "Clothe yourselves, all of you, with humility toward one another, for God opposes the proud but gives grace to the humble.",
      ref: "1 Peter 5:5",
      topic: "🙏 Being Humble"
    }
  ],

  evening: [
    {
      verse: "This calls for wisdom: let the one who has understanding calculate the number of the beast, for it is the number of a man, and his number is 666.",
      ref: "Revelation 13:18",
      topic: "⚠️ The Mark of 666"
    },
    {
      verse: "Also it causes all, both small and great, both rich and poor, both free and slave, to be marked on the right hand or the forehead, so that no one can buy or sell unless he has the mark.",
      ref: "Revelation 13:16-17",
      topic: "⚠️ The Mark of 666"
    },
    {
      verse: "If anyone worships the beast and its image and receives a mark on his forehead or on his hand, he also will drink the wine of God's wrath.",
      ref: "Revelation 14:9-10",
      topic: "⚠️ The Mark of 666"
    },
    {
      verse: "And the beast was captured, and with it the false prophet who in its presence had done the signs by which he deceived those who had received the mark of the beast.",
      ref: "Revelation 19:20",
      topic: "⚠️ The Mark of 666"
    },
    {
      verse: "Also I saw the souls of those who had been beheaded for the testimony of Jesus and for the word of God, and those who had not worshiped the beast or its image and had not received its mark.",
      ref: "Revelation 20:4",
      topic: "⚠️ The Mark of 666"
    }
  ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getRandomVerse(timeOfDay) {
  const list = bibleVerses[timeOfDay];
  return list[Math.floor(Math.random() * list.length)];
}

function buildMessage(timeOfDay) {
  const verse = getRandomVerse(timeOfDay);
  const now = moment().tz("Asia/Manila");
  const dateStr = now.format("dddd, MMMM D, YYYY");
  const timeStr = now.format("hh:mm A");

  const headers = {
    morning:   "🌅 GOOD MORNING — DAILY BIBLE REMINDER",
    afternoon: "☀️ GOOD AFTERNOON — DAILY BIBLE REMINDER",
    evening:   "🌙 GOOD EVENING — DAILY BIBLE REMINDER"
  };

  const footers = {
    morning:   "Start your day by guarding your heart and eyes. Let this verse guide you today. 🙏",
    afternoon: "Midday reflection: Stay humble in all that you do and God will lift you up. 🕊️",
    evening:   "End your day with vigilance. Know the signs of the end times and stand firm in faith. ✝️"
  };

  return (
    `📖 ✝️ ${headers[timeOfDay]}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 ${dateStr}\n` +
    `🕐 ${timeStr} (PH Time)\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${verse.topic}\n\n` +
    `❝ ${verse.verse} ❞\n\n` +
    `📌 — ${verse.ref}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💬 ${footers[timeOfDay]}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 Auto Bible Reminder | Philippines 🇵🇭`
  );
}

function getScheduledTime(hour, minute = 0) {
  // Returns ms until next occurrence of HH:MM in PH timezone
  const now = moment().tz("Asia/Manila");
  const target = moment().tz("Asia/Manila").set({ hour, minute, second: 0, millisecond: 0 });
  if (target.isSameOrBefore(now)) target.add(1, "day");
  return target.diff(now);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ COMMAND CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.config = {
  name: "reminder",
  version: "1.0.0",
  role: 2, // Bot owner only to set up
  credits: "selov",
  description: "Sends daily Bible reminders every morning, afternoon, and evening (PH Time) about lustful sins, humility, and the mark of 666.",
  commandCategory: "spiritual",
  usages: "/reminder <start | stop | status | test <morning|afternoon|evening>>",
  cooldowns: 5,
  aliases: ["bibletime", "biblereminder", "dailybible"]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 MAIN RUN FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Store active reminders per thread
if (!global.bibleReminders) global.bibleReminders = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const cmd = (args[0] || "").toLowerCase().trim();
  const sub = (args[1] || "").toLowerCase().trim();

  // ── GET USER NAME ──
  const userInfo = await api.getUserInfo(senderID);
  const userName = userInfo[senderID]?.name || "User";

  // ── NO ARGS: SHOW HELP ──
  if (!cmd) {
    return api.sendMessage(
      `📖 ✝️ BIBLE REMINDER COMMAND\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Hello, ${userName}!\n\n` +
      `This command sends daily Bible verses to this thread at:\n` +
      `🌅 Morning   — 6:00 AM (PH)\n` +
      `☀️ Afternoon  — 12:00 PM (PH)\n` +
      `🌙 Evening   — 8:00 PM (PH)\n\n` +
      `📚 Topics covered:\n` +
      `• 🔥 Lustful Sins\n` +
      `• 🙏 Being Humble\n` +
      `• ⚠️ The Mark of 666\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 Commands:\n` +
      `/reminder start — Start reminders\n` +
      `/reminder stop  — Stop reminders\n` +
      `/reminder status — Check if active\n` +
      `/reminder test morning|afternoon|evening\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`,
      threadID,
      messageID
    );
  }

  // ── START ──
  if (cmd === "start") {
    if (global.bibleReminders[threadID]) {
      return api.sendMessage(
        `✅ Bible reminders are already running in this thread!\n` +
        `Use /reminder stop to stop them first.`,
        threadID,
        messageID
      );
    }

    api.sendMessage(
      `✅ ✝️ Bible Reminder STARTED!\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 Daily reminders will be sent at:\n` +
      `🌅 6:00 AM  — Lustful Sins\n` +
      `☀️ 12:00 PM — Humility\n` +
      `🌙 8:00 PM  — Mark of 666\n\n` +
      `🇵🇭 Timezone: Asia/Manila\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Type /reminder stop to disable.`,
      threadID,
      messageID
    );

    // Schedule all three reminders
    scheduleReminder(api, threadID, "morning",   6,  0);
    scheduleReminder(api, threadID, "afternoon", 12, 0);
    scheduleReminder(api, threadID, "evening",   20, 0);

    global.bibleReminders[threadID] = true;
    return;
  }

  // ── STOP ──
  if (cmd === "stop") {
    if (!global.bibleReminders[threadID]) {
      return api.sendMessage(
        `⚠️ No active Bible reminders found in this thread.\n` +
        `Use /reminder start to begin.`,
        threadID,
        messageID
      );
    }

    // Clear stored timers
    const timers = global.bibleReminderTimers?.[threadID];
    if (timers) {
      timers.forEach(t => clearTimeout(t));
      delete global.bibleReminderTimers[threadID];
    }

    delete global.bibleReminders[threadID];

    return api.sendMessage(
      `🛑 Bible reminders have been STOPPED for this thread.\n` +
      `Type /reminder start to re-enable anytime. 🙏`,
      threadID,
      messageID
    );
  }

  // ── STATUS ──
  if (cmd === "status") {
    const active = !!global.bibleReminders[threadID];
    const now = moment().tz("Asia/Manila");

    const nextMorning   = moment().tz("Asia/Manila").set({ hour: 6,  minute: 0, second: 0 });
    const nextAfternoon = moment().tz("Asia/Manila").set({ hour: 12, minute: 0, second: 0 });
    const nextEvening   = moment().tz("Asia/Manila").set({ hour: 20, minute: 0, second: 0 });
    if (nextMorning.isSameOrBefore(now))   nextMorning.add(1, "day");
    if (nextAfternoon.isSameOrBefore(now)) nextAfternoon.add(1, "day");
    if (nextEvening.isSameOrBefore(now))   nextEvening.add(1, "day");

    return api.sendMessage(
      `📊 REMINDER STATUS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 Thread: ${threadID}\n` +
      `🔔 Status: ${active ? "✅ ACTIVE" : "❌ INACTIVE"}\n` +
      `🕐 PH Time Now: ${now.format("hh:mm A, MMM D YYYY")}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Next scheduled sends:\n` +
      `🌅 Morning   → ${nextMorning.format("hh:mm A, MMM D")}\n` +
      `☀️ Afternoon  → ${nextAfternoon.format("hh:mm A, MMM D")}\n` +
      `🌙 Evening   → ${nextEvening.format("hh:mm A, MMM D")}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`,
      threadID,
      messageID
    );
  }

  // ── TEST ──
  if (cmd === "test") {
    const validTimes = ["morning", "afternoon", "evening"];
    if (!validTimes.includes(sub)) {
      return api.sendMessage(
        `⚠️ Please specify a time to test.\n` +
        `Usage: /reminder test <morning|afternoon|evening>`,
        threadID,
        messageID
      );
    }

    api.sendTypingIndicator(threadID);
    await new Promise(r => setTimeout(r, 1000));
    const msg = buildMessage(sub);
    return api.sendMessage(msg, threadID, messageID);
  }

  // ── UNKNOWN SUBCOMMAND ──
  return api.sendMessage(
    `❓ Unknown command: "${cmd}"\n` +
    `Use /reminder for help.`,
    threadID,
    messageID
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏰ SCHEDULER FUNCTION (recursive daily loop)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function scheduleReminder(api, threadID, timeOfDay, hour, minute) {
  if (!global.bibleReminderTimers) global.bibleReminderTimers = {};
  if (!global.bibleReminderTimers[threadID]) global.bibleReminderTimers[threadID] = [];

  const delay = getScheduledTime(hour, minute);

  const timer = setTimeout(async () => {
    // Only send if reminders are still active for this thread
    if (!global.bibleReminders[threadID]) return;

    try {
      const msg = buildMessage(timeOfDay);
      await api.sendMessage(msg, threadID);
    } catch (err) {
      console.error(`[BibleReminder] Failed to send ${timeOfDay} verse to ${threadID}:`, err);
    }

    // Reschedule for next day
    scheduleReminder(api, threadID, timeOfDay, hour, minute);
  }, delay);

  global.bibleReminderTimers[threadID].push(timer);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 HANDLE REPLY (optional interaction)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, body } = event;
  const text = (body || "").toLowerCase();

  if (text.includes("amen") || text.includes("amen!")) {
    return api.sendMessage(
      `🙏 Amen! May God's word guide you today.\n` +
      `Stay strong in faith. ✝️`,
      threadID,
      messageID
    );
  }

  if (text.includes("thank") || text.includes("salamat")) {
    return api.sendMessage(
      `❤️ God bless you! Keep reading His word daily.\n` +
      `✝️ "Your word is a lamp to my feet and a light to my path." — Psalm 119:105`,
      threadID,
      messageID
    );
  }

  api.sendMessage(
    `✝️ Thank you for engaging with God's word!\n` +
    `🙏 May this verse bless your day.`,
    threadID,
    messageID
  );
};
