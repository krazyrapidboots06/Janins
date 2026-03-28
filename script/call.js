const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const mediaTypes = ["photo", 'png', "animated_image", "video", "audio"];

module.exports.config = {
  name: "call",
  version: "2.0.0",
  role: 0,
  credits: "Selov",
  description: "Send reports, feedback, or bugs to bot admins",
  commandCategory: "contacts",
  usages: "/call <message>",
  cooldowns: 5,
  aliases: ["callad", "calladmin"]
};

// Global storage for reply handlers
if (!global.callReplyHandlers) global.callReplyHandlers = {};

// Stylize function (aesthetic font)
function stylize(text) {
  const fonts = {
    "a": "𝖺", "b": "𝖻", "c": "𝖼", "d": "𝖽", "e": "𝖾", "f": "𝖿", "g": "𝗀", "h": "𝗁", "i": "𝗂", "j": "𝗃", "k": "𝗄", "l": "𝗅", "m": "𝗆",
    "n": "𝗇", "o": "𝗈", "p": "𝗉", "q": "𝗊", "r": "𝗋", "s": "𝗌", "t": "𝗍", "u": "𝗎", "v": "𝗏", "w": "𝗐", "x": "𝗑", "y": "𝗒", "z": "𝗓",
    "0": "𝟎", "1": "𝟏", "2": "𝟐", "3": "𝟑", "4": "𝟒", "5": "𝟓", "6": "𝟔", "7": "𝟕", "8": "𝟖", "9": "𝟗"
  };
  return text.toString().toLowerCase().split('').map(char => fonts[char] || char).join('');
}

// Get attachment streams
async function getStreamsFromAttachment(attachments) {
  const streams = [];
  for (const att of attachments) {
    try {
      const response = await axios.get(att.url, { responseType: 'stream' });
      streams.push(response.data);
    } catch (e) {
      console.error("Error downloading attachment:", e);
    }
  }
  return streams;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, isGroup, attachments, messageReply } = event;
  const message = args.join(" ").trim();

  // Get admin list from config (you need to set this)
  const adminUIDs = ["61556388598622", "61552057602849"]; // Add your admin UIDs here

  if (!message) {
    return api.sendMessage(
      `╭── Ი𐑼 𖹭 𝖾𝗋𝗋𝗈𝗋 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗉𝗅𝖾𝖺𝗌𝖾 𝖾𝗇𝗍𝖾𝗋 𝖺 𝗆𝖾𝗌𝗌𝖺𝗀𝖾\n\n╰── ᯓ★˙𐃷˙݁ ˖Ი𐑼⋆𖹭.ᐟ ──╯`,
      threadID,
      messageID
    );
  }

  if (adminUIDs.length === 0) {
    return api.sendMessage("ᯓ★ 𝗇𝗈 𝖺𝖽𝗆𝗂𝗇𝗌 𝖼𝗈𝗇𝖿𝗂𝗀𝗎𝗋𝖾𝖽 Ი𐑼", threadID, messageID);
  }

  // Set reaction
  api.setMessageReaction("📨", messageID, () => {}, true);

  // Get sender info
  const user = await api.getUserInfo(senderID);
  const senderName = user[senderID]?.name || "User";

  // Prepare message header
  const msgHead = `╭── Ი𐑼 𖹭 𝖼𝖺𝗅𝗅 𝖺𝖽𝗆𝗂𝗇 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗎𝗌𝖾𝗋: ${stylize(senderName)}\n  ⋆ 𝗎𝗂𝖽: ${stylize(senderID)}`;
  
  let groupInfo = "";
  if (isGroup) {
    const threadInfo = await api.getThreadInfo(threadID);
    groupInfo = `\n  ⋆ 𝗀𝗋𝗈𝗎𝗉: ${stylize(threadInfo.threadName)}\n  ⋆ 𝗍𝗂𝖽: ${stylize(threadID)}`;
  } else {
    groupInfo = `\n  ⋆ 𝗌𝖾𝗇𝗍 𝖻𝗒: 𝗉𝗋𝗂𝗏𝖺𝗍𝖾 𝗎𝗌𝖾𝗋`;
  }

  // Get attachments
  const allAttachments = [...attachments, ...(messageReply?.attachments || [])];
  const attachmentStreams = await getStreamsFromAttachment(allAttachments.filter(item => mediaTypes.includes(item.type)));

  const formMessage = {
    body: msgHead + groupInfo + `\n\n╭── Ი𐑼 𖹭 𝖼𝗈𝗇𝗍𝖾𝗇𝗍 𖹭 Ი𐑼 ──╮\n\n${stylize(message)}\n\n╰── 𝗋𝖾𝗉𝗅𝗒 𝗍𝗈 𝗋𝖾𝗌𝗉𝗈𝗇𝖽 ──╯`,
    mentions: [{ id: senderID, tag: senderName }],
    attachment: attachmentStreams
  };

  // Send to all admins
  const successIDs = [];
  const failedIDs = [];
  const adminNames = [];

  for (const uid of adminUIDs) {
    try {
      const adminInfo = await api.getUserInfo(uid);
      const adminName = adminInfo[uid]?.name || "Admin";
      adminNames.push({ id: uid, name: adminName });
      
      const sentMsg = await api.sendMessage(formMessage, uid);
      successIDs.push(uid);
      
      // Store for reply handling
      global.callReplyHandlers[sentMsg.messageID] = {
        type: "userCallAdmin",
        threadID: threadID,
        messageIDSender: messageID,
        senderID: senderID,
        senderName: senderName
      };
    } catch (err) {
      failedIDs.push(uid);
      console.error(`Failed to send to admin ${uid}:`, err.message);
    }
  }

  // Prepare result message
  let finalMsg = "";
  if (successIDs.length > 0) {
    const adminList = adminNames
      .filter(item => successIDs.includes(item.id))
      .map(item => `  ⋆ ${stylize(item.name)}`)
      .join("\n");
    
    finalMsg = `╭── Ი𐑼 𖹭 𝗌𝗎𝖼𝖼𝖾𝗌𝗌 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗌𝖾𝗇𝗍 𝗍𝗈 ${successIDs.length} 𝖺𝖽𝗆𝗂𝗇𝗌\n${adminList}\n\n╰── ᯓ★˙𐃷˙݁ ˖Ი𐑼⋆𖹭.ᐟ ──╯`;
  }

  if (failedIDs.length > 0) {
    finalMsg += `\n\n╭── Ი𐑼 𖹭 𝖾𝗋𝗋𝗈𝗋 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝖿𝖺𝗂𝗅𝖾𝖽 𝗍𝗈 𝗋𝖾𝖺𝖼𝗁 ${failedIDs.length} 𝖺𝖽𝗆𝗂𝗇𝗌\n\n╰── ᯓ★˙𐃷˙݁ ˖Ი𐑼⋆𖹭.ᐟ ──╯`;
  }

  return api.sendMessage({
    body: finalMsg,
    mentions: adminNames.map(item => ({ id: item.id, tag: item.name }))
  }, threadID, messageID);
};

// Handle replies from admins
module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, attachments, messageReply } = event;

  if (!messageReply) return;

  const repliedMessageID = messageReply.messageID;
  const handlerData = global.callReplyHandlers[repliedMessageID];

  if (!handlerData) return;

  const { type, threadID: userThreadID, messageIDSender, senderID: userSenderID, senderName } = handlerData;

  // Stylize function
  function stylize(text) {
    const fonts = {
      "a": "𝖺", "b": "𝖻", "c": "𝖼", "d": "𝖽", "e": "𝖾", "f": "𝖿", "g": "𝗀", "h": "𝗁", "i": "𝗂", "j": "𝗃", "k": "𝗄", "l": "𝗅", "m": "𝗆",
      "n": "𝗇", "o": "𝗈", "p": "𝗉", "q": "𝗊", "r": "𝗋", "s": "𝗌", "t": "𝗍", "u": "𝗎", "v": "𝗏", "w": "𝗐", "x": "𝗑", "y": "𝗒", "z": "𝗓",
      "0": "𝟎", "1": "𝟏", "2": "𝟐", "3": "𝟑", "4": "𝟒", "5": "𝟓", "6": "𝟔", "7": "𝟕", "8": "𝟖", "9": "𝟗"
    };
    return text.toString().toLowerCase().split('').map(char => fonts[char] || char).join('');
  }

  // Get current user info
  const currentUser = await api.getUserInfo(senderID);
  const currentUserName = currentUser[senderID]?.name || "Admin";

  const replyText = body || "";
  const attachmentStreams = await getStreamsFromAttachment(attachments.filter(item => mediaTypes.includes(item.type)));

  if (type === "userCallAdmin") {
    // Admin replying to user
    const replyMessage = {
      body: `╭── Ი𐑼 𖹭 𝖺𝖽𝗆𝗂𝗇 𝗋𝖾𝗉𝗅𝗒 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝖿𝗋𝗈𝗆: ${stylize(currentUserName)}\n\n${stylize(replyText)}\n\n╰── 𝗋𝖾𝗉𝗅𝗒 𝗍𝗈 𝖼𝗈𝗇𝗍𝗂𝗇𝗎𝖾 ──╯`,
      mentions: [{ id: senderID, tag: currentUserName }],
      attachment: attachmentStreams
    };

    api.sendMessage(replyMessage, userThreadID, (err, info) => {
      if (err) {
        console.error("Error sending reply to user:", err);
        return;
      }
      
      // Send confirmation to admin
      api.sendMessage(
        `╭── Ი𐑼 𖹭 𝗌𝗎𝖼𝖼𝖾𝗌𝗌 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗋𝖾𝗉𝗅𝗒 𝖽𝖾𝗅𝗂𝗏𝖾𝗋𝖾𝖽\n\n╰── ᯓ★˙𐃷˙݁ ˖Ი𐑼⋆𖹭.ᐟ ──╯`,
        threadID,
        messageID
      );
      
      // Store for further replies from user
      global.callReplyHandlers[info.messageID] = {
        type: "adminReply",
        threadID: threadID,
        messageIDSender: info.messageID,
        senderID: senderID,
        senderName: currentUserName
      };
    }, messageIDSender);
    
  } else if (type === "adminReply") {
    // User replying to admin's message
    let groupInfo = "";
    const isGroup = await api.getThreadInfo(threadID).catch(() => null);
    
    if (isGroup && isGroup.threadName) {
      groupInfo = `\n  ⋆ 𝗀𝗋𝗈𝗎𝗉: ${stylize(isGroup.threadName)}\n  ⋆ 𝗍𝗂𝖽: ${stylize(threadID)}`;
    }
    
    const feedbackMessage = {
      body: `╭── Ი𐑼 𖹭 𝖿𝖾𝖾𝖽𝖻𝖺𝖼𝗄 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗎𝗌𝖾𝗋: ${stylize(senderName || "User")}\n  ⋆ 𝗎𝗂𝖽: ${stylize(senderID)}${groupInfo}\n\n${stylize(replyText)}\n\n╰── 𝗋𝖾𝗉𝗅𝗒 𝗍𝗈 𝗋𝖾𝗌𝗉𝗈𝗇𝖽 ──╯`,
      mentions: [{ id: senderID, tag: senderName || "User" }],
      attachment: attachmentStreams
    };

    api.sendMessage(feedbackMessage, handlerData.threadID, (err, info) => {
      if (err) {
        console.error("Error sending feedback to admin:", err);
        return;
      }
      
      api.sendMessage(
        `╭── Ი𐑼 𖹭 𝗌𝗎𝖼𝖼𝖾𝗌𝗌 𖹭 Ი𐑼 ──╮\n\n  ᯓ★ 𝗋𝖾𝗌𝗉𝗈𝗇𝗌𝖾 𝗌𝖾𝗇𝗍 𝗍𝗈 𝗎𝗌𝖾𝗋\n\n╰── ᯓ★˙𐃷˙݁ ˖Ი𐑼⋆𖹭.ᐟ ──╯`,
        threadID,
        messageID
      );
      
      global.callReplyHandlers[info.messageID] = {
        type: "userCallAdmin",
        threadID: userThreadID,
        messageIDSender: messageIDSender,
        senderID: senderID,
        senderName: senderName
      };
    }, handlerData.messageIDSender);
  }
};

// Helper: Get attachment streams
async function getStreamsFromAttachment(attachments) {
  const streams = [];
  for (const att of attachments) {
    try {
      const response = await axios.get(att.url, { responseType: 'stream' });
      streams.push(response.data);
    } catch (e) {
      console.error("Error downloading attachment:", e);
    }
  }
  return streams;
}
