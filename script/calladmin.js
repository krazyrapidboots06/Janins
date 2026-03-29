const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const mediaTypes = ["photo", 'png', "animated_image", "video", "audio"];

// Admin UIDs - Add your admin IDs here
const ADMIN_UIDS = ["61556388598622"];

module.exports.config = {
  name: "callad",
  version: "1.7",
  role: 0,
  credits: "selov",
  description: "Send reports, feedback, bugs to bot admin",
  commandCategory: "contacts",
  usages: "/callad <message>",
  cooldowns: 5,
  aliases: ["report", "feedback"]
};

// Global store for reply handlers
if (!global.calladReplyHandlers) global.calladReplyHandlers = {};

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

  if (!message) {
    return api.sendMessage(
      "📨 CALL ADMIN\n━━━━━━━━━━━━━━━━\n" +
      "Please enter the message you want to send to admin.\n\n" +
      "Example: /callad sira command\n" +
      "Reply to an image:** /callad Check this image",
      threadID,
      messageID
    );
  }

  if (ADMIN_UIDS.length === 0) {
    return api.sendMessage("❌ Bot has no admin at the moment.", threadID, messageID);
  }

  // Set reaction
  api.setMessageReaction("📨", messageID, () => {}, true);

  // Get sender info
  const userInfo = await api.getUserInfo(senderID);
  const senderName = userInfo[senderID]?.name || "User";

  // Prepare message header
  let msgHeader = `📨 CALL ADMIN\n━━━━━━━━━━━━━━━━\n👤 User: ${senderName}\n🆔 ID: ${senderID}`;
  
  if (isGroup) {
    const threadInfo = await api.getThreadInfo(threadID);
    msgHeader += `\n📌 Group: ${threadInfo.threadName}\n🔢 Group ID: ${threadID}`;
  } else {
    msgHeader += `\n💬 Private Message`;
  }

  // Get attachments
  const allAttachments = [...attachments, ...(messageReply?.attachments || [])];
  const attachmentStreams = await getStreamsFromAttachment(allAttachments.filter(item => mediaTypes.includes(item.type)));

  const formMessage = {
    body: msgHeader + `\n━━━━━━━━━━━━━━━━\n💬 **Message:**\n${message}\n━━━━━━━━━━━━━━━━\n💡 Reply to this message to respond to user.`,
    mentions: [{ id: senderID, tag: senderName }],
    attachment: attachmentStreams
  };

  // Send to all admins
  const successIDs = [];
  const failedIDs = [];

  for (const uid of ADMIN_UIDS) {
    try {
      const adminInfo = await api.getUserInfo(uid);
      const adminName = adminInfo[uid]?.name || "Admin";
      
      const sentMsg = await api.sendMessage(formMessage, uid);
      successIDs.push(uid);
      
      // Store for reply handling
      global.calladReplyHandlers[sentMsg.messageID] = {
        type: "userCallAdmin",
        threadID: threadID,
        messageIDSender: messageID,
        senderID: senderID,
        senderName: senderName
      };
    } catch (err) {
      failedIDs.push({ adminID: uid, error: err.message });
      console.error(`Failed to send to admin ${uid}:`, err.message);
    }
  }

  // Prepare result message
  let resultMsg = "";
  if (successIDs.length > 0) {
    resultMsg = `✅ Message sent to ${successIDs.length} admin(s) successfully!`;
  }
  if (failedIDs.length > 0) {
    resultMsg += `\n❌ Failed to send to ${failedIDs.length} admin(s).`;
  }

  if (resultMsg) {
    api.sendMessage(resultMsg, threadID, messageID);
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
  const attachmentStreams = await getStreamsFromAttachment(attachments.filter(item => mediaTypes.includes(item.type)));

  if (type === "userCallAdmin") {
    // Admin replying to user
    const replyMessage = {
      body: `📨 ADMIN REPLY\n━━━━━━━━━━━━━━━━\n👤 From: ${currentUserName}\n━━━━━━━━━━━━━━━━\n💬 Message:\n${replyText}\n━━━━━━━━━━━━━━━━\n💡 Reply to continue conversation.`,
      mentions: [{ id: senderID, tag: currentUserName }],
      attachment: attachmentStreams
    };

    api.sendMessage(replyMessage, userThreadID, (err, info) => {
      if (err) {
        console.error("Error sending reply to user:", err);
        return;
      }
      
      // Send confirmation to admin
      api.sendMessage(`✅ Reply sent to user successfully!`, threadID, messageID);
      
      // Store for further replies from user
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
      groupInfo = `\n📌 Group: ${isGroup.threadName}\n🔢 Group ID: ${threadID}`;
    }
    
    const feedbackMessage = {
      body: `📨 USER REPLY\n━━━━━━━━━━━━━━━━\n👤 User: ${userName || "User"}\n🆔 ID: ${userSenderID}${groupInfo}\n━━━━━━━━━━━━━━━━\n💬 Message:\n${replyText}\n━━━━━━━━━━━━━━━━\n💡 Reply to continue conversation.`,
      mentions: [{ id: userSenderID, tag: userName || "User" }],
      attachment: attachmentStreams
    };

    api.sendMessage(feedbackMessage, handlerData.threadID, (err, info) => {
      if (err) {
        console.error("Error sending feedback to admin:", err);
        return;
      }
      
      api.sendMessage(`✅ Reply sent to admin successfully!`, threadID, messageID);
      
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
