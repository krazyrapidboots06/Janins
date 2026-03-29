const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// Admin UIDs - Make sure these are correct
const ADMIN_UIDS = ["61556388598622"];

module.exports.config = {
  name: "callad",
  version: "2.0.1", // Updated version to reflect changes
  hasPermssion: 0,
  credits: "NTKhang & Manus", // Added Manus for the fix
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

  // Get sender info with robust error handling
  let senderName = "User";
  try {
    const userInfo = await api.getUserInfo(senderID);
    senderName = userInfo[senderID]?.name || "User";
  } catch (e) {
    console.error("Error getting sender info:", e);
  }

  // Prepare message header
  let msgHeader = `📨 **CALL ADMIN**\n━━━━━━━━━━━━━━━━\n👤 **User:** ${senderName}\n🆔 **ID:** ${senderID}`;
  
  if (isGroup) {
    let threadName = "Group Chat";
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      threadName = threadInfo.threadName || "Group Chat";
    } catch (e) {
      console.error("Error getting thread info:", e);
    }
    msgHeader += `\n📌 **Group:** ${threadName}\n🔢 **Group ID:** ${threadID}`;
  } else {
    msgHeader += `\n💬 **Private Message**`;
  }

  const formMessage = {
    body: msgHeader + `\n━━━━━━━━━━━━━━━━\n💬 **Message:**\n${message}\n━━━━━━━━━━━━━━━━\n💡 Reply to this message to respond to user.`,
    mentions: [{ id: senderID, tag: senderName }]
  };

  // NOTE: Attachment handling for remote URLs can be complex and might require downloading them first.
  // For now, we will skip forwarding attachments to prevent potential issues.
  // If attachment forwarding is critical, a more robust solution involving downloading 
  // attachments to local temp files before sending would be needed.
  // if (attachments && attachments.length > 0) {
  //   formMessage.attachment = attachments.map(att => 
  //     fs.createReadStream(att.url)
  //   );
  // }

  // Send to all admins
  const successIDs = [];
  const failedIDs = [];

  for (const uid of ADMIN_UIDS) {
    try {
      // Check if admin exists and is reachable
      const adminInfo = await api.getUserInfo(uid).catch(() => null);
      if (!adminInfo || !adminInfo[uid]) {
        failedIDs.push({ adminID: uid, error: "Admin UID not found or unreachable" });
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
      console.error(`Failed to send message to admin ${uid}:`, err);
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
      `• Admin UIDs may be incorrect or unreachable\n` +
      `• Bot needs to be friends with admins\n` +
      `• Error details for failed sends: ${failedIDs.map(f => `${f.adminID}: ${f.error}`).join("; ")}`,
      threadID,
      messageID
    );
  } else {
    api.sendMessage("⚠️ No admins configured or all failed to receive the message.", threadID, messageID);
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

  // Get current user info with robust error handling
  let currentUserName = "Admin";
  try {
    const currentUser = await api.getUserInfo(senderID);
    currentUserName = currentUser[senderID]?.name || "Admin";
  } catch (e) {
    console.error("Error getting current user info for reply:", e);
  }

  const replyText = body || "";

  // NOTE: Attachment handling for remote URLs can be complex and might require downloading them first.
  // For now, we will skip forwarding attachments to prevent potential issues.
  // If attachment forwarding is critical, a more robust solution involving downloading 
  // attachments to local temp files before sending would be needed.
  const replyAttachments = [];
  // if (attachments && attachments.length > 0) {
  //   replyAttachments = attachments.map(att => 
  //     fs.createReadStream(att.url)
  //   );
  // }

  if (type === "userCallAdmin") {
    // Admin replying to user
    const replyMessage = {
      body: `📨 **ADMIN REPLY**\n━━━━━━━━━━━━━━━━\n👤 **From:** ${currentUserName}\n━━━━━━━━━━━━━━━━\n💬 **Message:**\n${replyText}\n━━━━━━━━━━━━━━━━\n💡 Reply to continue conversation.`,
      mentions: [{ id: senderID, tag: currentUserName }],
      attachment: replyAttachments
    };

    api.sendMessage(replyMessage, userThreadID, (err, info) => {
      if (err) {
        console.error(`❌ Failed to send reply to user ${userSenderID} in thread ${userThreadID}:`, err);
        api.sendMessage(`❌ Failed to send reply: ${err.message}`, threadID, messageID);
        return;
      }
      
      api.sendMessage(`✅ **Reply sent to user successfully!**`, threadID, messageID);
      
      // Update handler for continuous conversation
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
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      if (threadInfo && threadInfo.threadName) {
        groupInfo = `\n📌 **Group:** ${threadInfo.threadName}\n🔢 **Group ID:** ${threadID}`;
      }
    } catch (e) {
      console.error("Error getting thread info for user reply:", e);
    }
    
    const feedbackMessage = {
      body: `📨 **USER REPLY**\n━━━━━━━━━━━━━━━━\n👤 **User:** ${userName || "User"}\n🆔 **ID:** ${userSenderID}${groupInfo}\n━━━━━━━━━━━━━━━━\n💬 **Message:**\n${replyText}\n━━━━━━━━━━━━━━━━\n💡 Reply to continue conversation.`,
      mentions: [{ id: userSenderID, tag: userName || "User" }],
      attachment: replyAttachments
    };

    api.sendMessage(feedbackMessage, handlerData.threadID, (err, info) => {
      if (err) {
        console.error(`❌ Failed to send user reply to admin ${handlerData.senderID} in thread ${handlerData.threadID}:`, err);
        api.sendMessage(`❌ Failed to send reply: ${err.message}`, threadID, messageID);
        return;
      }
      
      api.sendMessage(`✅ **Reply sent to admin successfully!**`, threadID, messageID);
      
      // Update handler for continuous conversation
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
