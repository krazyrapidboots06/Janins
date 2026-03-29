const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Admin UIDs - Make sure these are correct
const ADMIN_UIDS = ["61556388598622"];

module.exports.config = {
  name: "callad",
  version: "2.0.0",
  role: 0,
  credits: "NTKhang",
  description: "Send reports, feedback, bugs to bot admin",
  commandCategory: "contacts",
  usages: "/callad <message>",
  cooldowns: 5,
  aliases: ["report", "feedback"]
};

// Global store for reply handlers
if (!global.calladReplyHandlers) global.calladReplyHandlers = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, isGroup, attachments, messageReply } = event;
  const message = args.join(" ").trim();

  if (!message) {
    return api.sendMessage(
      "📨 **CALL ADMIN**\n━━━━━━━━━━━━━━━━\n" +
      "Please enter the message you want to send to admin.\n\n" +
      "**Example:** /callad There's a bug in the bot",
      threadID,
      messageID
    );
  }

  if (ADMIN_UIDS.length === 0) {
    return api.sendMessage("❌ Bot has no admin configured.", threadID, messageID);
  }

  // Set reaction
  api.setMessageReaction("📨", messageID, () => {}, true);

  // Get sender info
  const userInfo = await api.getUserInfo(senderID);
  const senderName = userInfo[senderID]?.name || "User";

  // Prepare message header
  let msgHeader = `📨 **CALL ADMIN**\n━━━━━━━━━━━━━━━━\n👤 **User:** ${senderName}\n🆔 **ID:** ${senderID}`;
  
  if (isGroup) {
    const threadInfo = await api.getThreadInfo(threadID);
    msgHeader += `\n📌 **Group:** ${threadInfo.threadName}\n🔢 **Group ID:** ${threadID}`;
  } else {
    msgHeader += `\n💬 **Private Message**`;
  }

  const formMessage = {
    body: msgHeader + `\n━━━━━━━━━━━━━━━━\n💬 **Message:**\n${message}\n━━━━━━━━━━━━━━━━\n💡 Reply to this message to respond to user.`,
    mentions: [{ id: senderID, tag: senderName }]
  };

  // Add attachments if any
  if (attachments && attachments.length > 0) {
    formMessage.attachment = attachments.map(att => 
      fs.createReadStream(att.url)
    );
  }

  // Send to all admins
  const successIDs = [];
  const failedIDs = [];

  for (const uid of ADMIN_UIDS) {
    try {
      const adminInfo = await api.getUserInfo(uid).catch(() => null);
      
      if (!adminInfo || !adminInfo[uid]) {
        failedIDs.push({ adminID: uid, error: "Admin UID not found" });
        continue;
      }
      
      const sentMsg = await api.sendMessage(formMessage, uid);
      successIDs.push(uid);
      
      global.calladReplyHandlers[sentMsg.messageID] = {
        type: "userCallAdmin",
        threadID: threadID,
        messageIDSender: messageID,
        senderID: senderID,
        senderName: senderName
      };
      
    } catch (err) {
      failedIDs.push({ adminID: uid, error: err.message });
    }
  }

  // Prepare result message
  if (successIDs.length > 0) {
    api.sendMessage(`✅ **Message sent to ${successIDs.length} admin(s) successfully!**`, threadID, messageID);
  } else if (failedIDs.length > 0) {
    api.sendMessage(
      `❌ **Failed to send message to admins.**\n\n` +
      `💡 **Possible reasons:**\n` +
      `• Admins may have blocked the bot\n` +
      `• Admin UIDs may be incorrect\n` +
      `• Bot needs to be friends with admins`,
      threadID,
      messageID
    );
  }
};

// Handle replies from admins
module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, attachments, messageReply } = event;

  if (!messageReply) return;

  const repliedMessageID = messageReply.messageID;
  const handlerData = global.calladReplyHandlers[repliedMessageID];

  if (!handlerData) return;

  const { type, threadID: userThreadID, messageIDSender, senderID: userSenderID, senderName: userName } = handlerData;

  // Get current user info
  const currentUser = await api.getUserInfo(senderID);
  const currentUserName = currentUser[senderID]?.name || "Admin";

  const replyText = body || "";

  if (type === "userCallAdmin") {
    // Admin replying to user
    const replyMessage = {
      body: `📨 **ADMIN REPLY**\n━━━━━━━━━━━━━━━━\n👤 **From:** ${currentUserName}\n━━━━━━━━━━━━━━━━\n💬 **Message:**\n${replyText}\n━━━━━━━━━━━━━━━━\n💡 Reply to continue conversation.`,
      mentions: [{ id: senderID, tag: currentUserName }]
    };

    if (attachments && attachments.length > 0) {
      replyMessage.attachment = attachments.map(att => 
        fs.createReadStream(att.url)
      );
    }

    api.sendMessage(replyMessage, userThreadID, (err, info) => {
      if (err) {
        api.sendMessage(`❌ Failed to send reply: ${err.message}`, threadID, messageID);
        return;
      }
      
      api.sendMessage(`✅ **Reply sent to user successfully!**`, threadID, messageID);
      
      global.calladReplyHandlers[info.messageID] = {
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
      groupInfo = `\n📌 **Group:** ${isGroup.threadName}\n🔢 **Group ID:** ${threadID}`;
    }
    
    const feedbackMessage = {
      body: `📨 **USER REPLY**\n━━━━━━━━━━━━━━━━\n👤 **User:** ${userName || "User"}\n🆔 **ID:** ${userSenderID}${groupInfo}\n━━━━━━━━━━━━━━━━\n💬 **Message:**\n${replyText}\n━━━━━━━━━━━━━━━━\n💡 Reply to continue conversation.`,
      mentions: [{ id: userSenderID, tag: userName || "User" }]
    };

    if (attachments && attachments.length > 0) {
      feedbackMessage.attachment = attachments.map(att => 
        fs.createReadStream(att.url)
      );
    }

    api.sendMessage(feedbackMessage, handlerData.threadID, (err, info) => {
      if (err) {
        api.sendMessage(`❌ Failed to send reply: ${err.message}`, threadID, messageID);
        return;
      }
      
      api.sendMessage(`✅ **Reply sent to admin successfully!**`, threadID, messageID);
      
      global.calladReplyHandlers[info.messageID] = {
        type: "userCallAdmin",
        threadID: userThreadID,
        messageIDSender: messageIDSender,
        senderID: userSenderID,
        senderName: userName
      };
    }, handlerData.messageIDSender);
  }
};
