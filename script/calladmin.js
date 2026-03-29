"use strict";

const axios = require("axios");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ADMIN_GROUP_ID = "61556388598622"; // ← Change this to your admin group ID
const mediaTypes = ["photo", "animated_image", "video", "audio"];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ COMMAND CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.config = {
  name: "calladmin",
  version: "1.2.0",
  role: 0,
  credits: "SIFU (ported by selov)",
  description: "Relay messages between users and the admin group. Admins can reply back directly.",
  commandCategory: "contacts admin",
  usages: "/calladmin <message>",
  cooldowns: 5,
  aliases: ["callad", "contactadmin", "msgadmin"]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 HELPER: Fetch attachment streams via axios
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getAttachmentStreams(attachments) {
  const streams = [];
  for (const att of attachments) {
    try {
      const url = att.url || att.playable_url || att.preview_url;
      if (!url) continue;
      const res = await axios.get(url, { responseType: "stream", timeout: 10000 });
      streams.push(res.data);
    } catch (_) {
      // Skip failed attachments silently
    }
  }
  return streams;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 HELPER: Get user name safely
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getSenderName(api, senderID) {
  try {
    const info = await new Promise((res, rej) =>
      api.getUserInfo(senderID, (err, data) => err ? rej(err) : res(data))
    );
    return info?.[senderID]?.name || "Unknown User";
  } catch (_) {
    return "Unknown User";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 HELPER: Relay store (global)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (!global.calladminRelay) global.calladminRelay = new Map();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 MAIN RUN FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // ── NO MESSAGE ──
  if (!args[0]) {
    return api.sendMessage(
      `❌ Please enter a message!\n\n` +
      `📌 Usage:\n` +
      `/calladmin <your message>\n\n` +
      `📖 Example:\n` +
      `/calladmin Hello admin, I need help with something.`,
      threadID,
      messageID
    );
  }

  const senderName = await getSenderName(api, senderID);
  const messageText = args.join(" ");

  // Collect attachments from message + replied message
  const rawAttachments = [
    ...(event.attachments || []),
    ...(event.messageReply?.attachments || [])
  ].filter(a => mediaTypes.includes(a.type));

  const attachmentStreams = rawAttachments.length
    ? await getAttachmentStreams(rawAttachments)
    : [];

  const formMessage = {
    body:
      `📨 𝐌𝐞𝐬𝐬𝐚𝐠𝐞 𝐅𝐫𝐨𝐦 𝐔𝐬𝐞𝐫\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Name      : ${senderName}\n` +
      `🆔 User ID   : ${senderID}\n` +
      `💬 Thread ID : ${threadID}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 Message:\n${messageText}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 Reply to this message to respond to the user.`,
    ...(attachmentStreams.length && { attachment: attachmentStreams })
  };

  try {
    // Send to admin group
    const sentMsg = await new Promise((res, rej) =>
      api.sendMessage(formMessage, ADMIN_GROUP_ID, (err, info) =>
        err ? rej(err) : res(info)
      )
    );

    // Store relay data for admin reply
    global.calladminRelay.set(sentMsg.messageID, {
      type: "relayToUser",
      originalThreadID: threadID,
      originalSenderID: senderID,
      originalSenderName: senderName
    });

    // Confirm to sender
    return api.sendMessage(
      `✅ Your message has been sent to the admin group!\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 Message: "${messageText}"\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏳ Please wait for the admin's reply.\n` +
      `💡 If an admin replies, you will receive it here.`,
      threadID,
      messageID
    );
  } catch (err) {
    console.error("[CallAdmin] Send error:", err);
    return api.sendMessage(
      `❌ Failed to send your message to the admin group.\n` +
      `Please try again later.`,
      threadID,
      messageID
    );
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 HANDLE REPLY (two-way relay)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply } = event;

  // Get the original relay messageID that was replied to
  const relayKey = messageReply?.messageID;
  if (!relayKey) return;

  const relay = global.calladminRelay.get(relayKey);
  if (!relay) return;

  const senderName = await getSenderName(api, senderID);
  const replyText = (body || "").trim();

  // Collect attachments from reply
  const rawAttachments = (event.attachments || [])
    .filter(a => mediaTypes.includes(a.type));

  const attachmentStreams = rawAttachments.length
    ? await getAttachmentStreams(rawAttachments)
    : [];

  // ── ADMIN → USER relay ──────────────────────────────
  if (relay.type === "relayToUser") {
    const targetID = relay.originalThreadID;

    const formMessage = {
      body:
        `📩 𝐑𝐞𝐩𝐥𝐲 𝐅𝐫𝐨𝐦 𝐀𝐝𝐦𝐢𝐧\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🛡️ Admin    : ${senderName}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💬 Message:\n${replyText || "(No text — see attachment)"}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 Reply to this message to respond back.`,
      ...(attachmentStreams.length && { attachment: attachmentStreams })
    };

    try {
      const sentMsg = await new Promise((res, rej) =>
        api.sendMessage(formMessage, targetID, (err, info) =>
          err ? rej(err) : res(info)
        )
      );

      // Store relay so user can reply back to admin
      global.calladminRelay.set(sentMsg.messageID, {
        type: "relayToAdmin",
        originalThreadID: targetID,
        originalSenderID: relay.originalSenderID,
        originalSenderName: relay.originalSenderName
      });

      // Confirm to admin
      return api.sendMessage(
        `✅ Reply sent to user successfully!\n` +
        `👤 User: ${relay.originalSenderName}\n` +
        `💬 Thread ID: ${relay.originalThreadID}`,
        threadID,
        messageID
      );
    } catch (err) {
      console.error("[CallAdmin] Admin→User relay error:", err);
      return api.sendMessage(
        `❌ Failed to send reply to user.\n` +
        `Thread ID: ${relay.originalThreadID}`,
        threadID,
        messageID
      );
    }
  }

  // ── USER → ADMIN relay ──────────────────────────────
  if (relay.type === "relayToAdmin") {
    const formMessage = {
      body:
        `📨 𝐔𝐬𝐞𝐫 𝐑𝐞𝐩𝐥𝐢𝐞𝐝\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Name      : ${senderName}\n` +
        `🆔 User ID   : ${senderID}\n` +
        `💬 Thread ID : ${threadID}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 Message:\n${replyText || "(No text — see attachment)"}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 Reply to this message to respond back.`,
      ...(attachmentStreams.length && { attachment: attachmentStreams })
    };

    try {
      const sentMsg = await new Promise((res, rej) =>
        api.sendMessage(formMessage, ADMIN_GROUP_ID, (err, info) =>
          err ? rej(err) : res(info)
        )
      );

      // Store relay again so admin can reply again
      global.calladminRelay.set(sentMsg.messageID, {
        type: "relayToUser",
        originalThreadID: threadID,
        originalSenderID: senderID,
        originalSenderName: senderName
      });

      // Confirm to user
      return api.sendMessage(
        `✅ Your reply has been sent to the admin!\n` +
        `⏳ Please wait for their response.`,
        threadID,
        messageID
      );
    } catch (err) {
      console.error("[CallAdmin] User→Admin relay error:", err);
      return api.sendMessage(
        `❌ Failed to send your reply to the admin.\n` +
        `Please try again.`,
        threadID,
        messageID
      );
    }
  }
};
