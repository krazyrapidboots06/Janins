"use strict";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ COMMAND CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.config = {
  name: "sendnoti",
  version: "1.5.0",
  role: 3,
  credits: "NTKhang (converted by selov)",
  description: "Create and send notifications to group chats you manage",
  commandCategory: "box chat",
  usages: "/sendnoti <create | add | list | info | delete | remove | send> [args]",
  cooldowns: 5,
  aliases: ["noti", "groupnoti"]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 GLOBAL DATA STORE
// Stored in global.notiData[senderID] = [ ...groups ]
// Each group: { groupName, groupID, threadIDs: [] }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (!global.notiData) global.notiData = {};

function getUserGroups(senderID) {
  if (!global.notiData[senderID]) global.notiData[senderID] = [];
  return global.notiData[senderID];
}

function saveUserGroups(senderID, groups) {
  global.notiData[senderID] = groups;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getTime(timestamp) {
  const d = new Date(Number(timestamp));
  const pad = n => String(n).padStart(2, "0");
  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

async function getStreamsFromAttachment(attachments) {
  const axios = require("axios");
  const streams = [];
  for (const att of attachments) {
    try {
      const url = att.url || att.playbackUrl || att.previewUrl;
      if (!url) continue;
      const res = await axios.get(url, { responseType: "stream", timeout: 10000 });
      streams.push(res.data);
    } catch (_) {
      // skip failed attachments silently
    }
  }
  return streams;
}

async function isAdminOfThread(api, threadID, senderID) {
  try {
    const info = await api.getThreadInfo(threadID);
    const adminIDs = (info.adminIDs || []).map(a =>
      typeof a === "object" ? String(a.id) : String(a)
    );
    return adminIDs.includes(String(senderID));
  } catch (_) {
    return false;
  }
}

async function getThreadName(api, threadID) {
  try {
    const info = await api.getThreadInfo(threadID);
    return info.threadName || info.name || String(threadID);
  } catch (_) {
    return String(threadID);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 MAIN RUN FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID } = event;
  const cmd = (args[0] || "").toLowerCase().trim();
  const groups = getUserGroups(senderID);

  // ── NO ARGS: SHOW HELP ──────────────────────────
  if (!cmd) {
    return api.sendMessage(
      `📢 SENDNOTI COMMAND v1.5\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Manage & broadcast notifications to groups.\n\n` +
      `📌 COMMANDS:\n\n` +
      `▸ /sendnoti create <groupName>\n` +
      `  Create a new notification group\n\n` +
      `▸ /sendnoti add <groupName>\n` +
      `  Add this chat to a noti group\n` +
      `  (Must be admin of this chat)\n\n` +
      `▸ /sendnoti list\n` +
      `  Show all your notification groups\n\n` +
      `▸ /sendnoti info <groupName>\n` +
      `  View info of a notification group\n\n` +
      `▸ /sendnoti delete <groupName>\n` +
      `  Remove this chat from a noti group\n\n` +
      `▸ /sendnoti remove <groupName>\n` +
      `  Delete entire notification group\n\n` +
      `▸ /sendnoti send <groupName> | <message>\n` +
      `  Broadcast to all chats in the group\n` +
      `  (Attach images/videos if needed)\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      threadID
    );
  }

  // ────────────────────────────────────────────────
  // CREATE — /sendnoti create <groupName>
  // ────────────────────────────────────────────────
  if (cmd === "create") {
    const groupName = args.slice(1).join(" ").trim();

    if (!groupName) {
      return api.sendMessage(
        `❌ Please enter a notification group name.\n\n` +
        `📌 Usage: /sendnoti create <groupName>\n` +
        `📖 Example: /sendnoti create TEAM1`,
        threadID
      );
    }

    if (groups.some(item => item.groupName === groupName)) {
      return api.sendMessage(
        `❌ Notification group "${groupName}" already exists.\n` +
        `Please choose a different name.`,
        threadID
      );
    }

    const groupID = Date.now();
    groups.push({ groupName, groupID, threadIDs: [] });
    saveUserGroups(senderID, groups);

    return api.sendMessage(
      `✅ Notification group created!\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📛 Name : ${groupName}\n` +
      `🆔 ID   : ${groupID}\n` +
      `📅 Date : ${getTime(groupID)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Next step: go to a group chat and type\n` +
      `/sendnoti add ${groupName}`,
      threadID
    );
  }

  // ────────────────────────────────────────────────
  // ADD — /sendnoti add <groupName>
  // ────────────────────────────────────────────────
  if (cmd === "add") {
    const groupName = args.slice(1).join(" ").trim();

    if (!groupName) {
      return api.sendMessage(
        `❌ Please enter the notification group name.\n\n` +
        `📌 Usage: /sendnoti add <groupName>\n` +
        `📖 Example: /sendnoti add TEAM1`,
        threadID
      );
    }

    const getGroup = groups.find(item => item.groupName === groupName);
    if (!getGroup) {
      return api.sendMessage(
        `❌ No notification group found with name: "${groupName}"\n\n` +
        `Use /sendnoti list to see your groups.`,
        threadID
      );
    }

    const isAdmin = await isAdminOfThread(api, threadID, senderID);
    if (!isAdmin) {
      return api.sendMessage(
        `❌ You are not admin of this group chat.\n` +
        `Only group admins can add this chat to a notification group.`,
        threadID
      );
    }

    if (getGroup.threadIDs.includes(String(threadID))) {
      return api.sendMessage(
        `⚠️ This group chat is already in notification group: "${groupName}"`,
        threadID
      );
    }

    getGroup.threadIDs.push(String(threadID));
    saveUserGroups(senderID, groups);

    return api.sendMessage(
      `✅ Added this group chat to notification group: "${groupName}"\n` +
      `📊 Total chats in group: ${getGroup.threadIDs.length}`,
      threadID
    );
  }

  // ────────────────────────────────────────────────
  // LIST — /sendnoti list
  // ────────────────────────────────────────────────
  if (cmd === "list") {
    if (!groups.length) {
      return api.sendMessage(
        `📭 You have no notification groups yet.\n\n` +
        `Use /sendnoti create <groupName> to create one.`,
        threadID
      );
    }

    const listMsg = groups.map((item, i) =>
      `${i + 1}. ${item.groupName} — ${item.threadIDs.length} chat(s)`
    ).join("\n");

    return api.sendMessage(
      `📋 YOUR NOTIFICATION GROUPS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${listMsg}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Total: ${groups.length} group(s)`,
      threadID
    );
  }

  // ────────────────────────────────────────────────
  // INFO — /sendnoti info <groupName>
  // ────────────────────────────────────────────────
  if (cmd === "info") {
    const groupName = args.slice(1).join(" ").trim();

    if (!groupName) {
      return api.sendMessage(
        `❌ Please enter the notification group name.\n\n` +
        `📌 Usage: /sendnoti info <groupName>\n` +
        `📖 Example: /sendnoti info TEAM1`,
        threadID
      );
    }

    const getGroup = groups.find(item => item.groupName === groupName);
    if (!getGroup) {
      return api.sendMessage(
        `❌ No notification group found with name: "${groupName}"`,
        threadID
      );
    }

    const { threadIDs, groupID } = getGroup;
    let chatListMsg = "";

    if (threadIDs.length === 0) {
      chatListMsg = `  (No group chats added yet)\n`;
    } else {
      for (const tid of threadIDs) {
        const name = await getThreadName(api, tid);
        chatListMsg += `  • ${name}\n    ID: ${tid}\n\n`;
      }
    }

    return api.sendMessage(
      `📢 NOTIFICATION GROUP INFO\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📛 Name    : ${groupName}\n` +
      `🆔 ID      : ${groupID}\n` +
      `📅 Created : ${getTime(groupID)}\n` +
      `👥 Chats   : ${threadIDs.length}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📁 Group Chats:\n${chatListMsg}` +
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      threadID
    );
  }

  // ────────────────────────────────────────────────
  // DELETE — /sendnoti delete <groupName>
  // Removes the CURRENT thread from a noti group
  // ────────────────────────────────────────────────
  if (cmd === "delete") {
    const groupName = args.slice(1).join(" ").trim();

    if (!groupName) {
      return api.sendMessage(
        `❌ Please enter the notification group name.\n\n` +
        `📌 Usage: /sendnoti delete <groupName>\n` +
        `📖 Example: /sendnoti delete TEAM1`,
        threadID
      );
    }

    const getGroup = groups.find(item => item.groupName === groupName);
    if (!getGroup) {
      return api.sendMessage(
        `❌ No notification group found with name: "${groupName}"`,
        threadID
      );
    }

    const findIndex = getGroup.threadIDs.findIndex(tid => tid === String(threadID));
    if (findIndex === -1) {
      return api.sendMessage(
        `⚠️ This group chat is not in notification group: "${groupName}"`,
        threadID
      );
    }

    getGroup.threadIDs.splice(findIndex, 1);
    saveUserGroups(senderID, groups);

    return api.sendMessage(
      `✅ Removed this group chat from notification group: "${groupName}"\n` +
      `📊 Remaining chats in group: ${getGroup.threadIDs.length}`,
      threadID
    );
  }

  // ────────────────────────────────────────────────
  // REMOVE / -r — /sendnoti remove <groupName>
  // Deletes the ENTIRE notification group
  // ────────────────────────────────────────────────
  if (cmd === "remove" || cmd === "-r") {
    const groupName = args.slice(1).join(" ").trim();

    if (!groupName) {
      return api.sendMessage(
        `❌ Please enter the notification group name to remove.\n\n` +
        `📌 Usage: /sendnoti remove <groupName>\n` +
        `📖 Example: /sendnoti remove TEAM1`,
        threadID
      );
    }

    const findIndex = groups.findIndex(item => item.groupName === groupName);
    if (findIndex === -1) {
      return api.sendMessage(
        `❌ No notification group found with name: "${groupName}"`,
        threadID
      );
    }

    groups.splice(findIndex, 1);
    saveUserGroups(senderID, groups);

    return api.sendMessage(
      `🗑️ Notification group "${groupName}" has been removed.\n` +
      `📊 Remaining groups: ${groups.length}`,
      threadID
    );
  }

  // ────────────────────────────────────────────────
  // SEND — /sendnoti send <groupName> | <message>
  // Broadcasts message to all chats in the noti group
  // ────────────────────────────────────────────────
  if (cmd === "send") {
    const fullArgs = args.slice(1).join(" ");
    const splitPipe = fullArgs.split("|");
    const groupName = (splitPipe[0] || "").trim();
    const messageSend = splitPipe.slice(1).join("|").trim();

    if (!groupName) {
      return api.sendMessage(
        `❌ Please enter the notification group name.\n\n` +
        `📌 Usage: /sendnoti send <groupName> | <message>\n` +
        `📖 Example: /sendnoti send TEAM1 | Hello everyone!`,
        threadID
      );
    }

    const getGroup = groups.find(item => item.groupName === groupName);
    if (!getGroup) {
      return api.sendMessage(
        `❌ No notification group found with name: "${groupName}"`,
        threadID
      );
    }

    if (getGroup.threadIDs.length === 0) {
      return api.sendMessage(
        `⚠️ Notification group "${groupName}" has no group chats yet.\n\n` +
        `Go into a group chat and type:\n/sendnoti add ${groupName}`,
        threadID
      );
    }

    // Build form
    const formSend = { body: messageSend || "" };

    // Handle attachments from current message or replied message
    const allAttachments = [
      ...(event.attachments || []),
      ...(event.messageReply?.attachments || [])
    ].filter(att =>
      ["photo", "png", "animated_image", "video", "audio"].includes(att.type)
    );

    if (allAttachments.length) {
      formSend.attachment = await getStreamsFromAttachment(allAttachments);
    }

    const { threadIDs } = getGroup;

    // Loading message
    const loadMsg = await api.sendMessage(
      `📤 Broadcasting to ${threadIDs.length} group chat(s)...\n` +
      `📛 Group : "${groupName}"\n` +
      `⏳ Please wait...`,
      threadID
    );

    const success = [];
    const failed  = [];

    for (const tid of threadIDs) {
      // Small delay between sends to avoid rate limiting
      await new Promise(r => setTimeout(r, 800));

      try {
        const isAdmin  = await isAdminOfThread(api, tid, senderID);
        const chatName = await getThreadName(api, tid);

        if (!isAdmin) {
          failed.push({ threadID: tid, threadName: chatName, error: "PERMISSION_DENIED" });
          continue;
        }

        await new Promise((resolve, reject) => {
          api.sendMessage(formSend, tid, (err) => {
            if (err) return reject({ threadID: tid, threadName: chatName, error: err?.message || "SEND_FAILED" });
            resolve({ threadID: tid, threadName: chatName });
          });
        });

        success.push({ threadID: tid, threadName: chatName });
      } catch (err) {
        failed.push({
          threadID: tid,
          threadName: err?.threadName || String(tid),
          error: err?.error || err?.message || "UNKNOWN_ERROR"
        });
      }
    }

    // Delete loading message
    try { await api.unsendMessage(loadMsg.messageID); } catch (_) {}

    // Build result report
    let resultMsg =
      `📊 BROADCAST COMPLETE\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📛 Group   : "${groupName}"\n` +
      `📡 Total   : ${threadIDs.length} chat(s)\n` +
      `✅ Success : ${success.length}\n` +
      `❌ Failed  : ${failed.length}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (success.length) {
      resultMsg += `✅ Sent to:\n`;
      success.forEach(s => {
        resultMsg += `  • ${s.threadName} (${s.threadID})\n`;
      });
      if (failed.length) resultMsg += `\n`;
    }

    if (failed.length) {
      resultMsg += `❌ Failed:\n`;
      failed.forEach(f => {
        const reason = f.error === "PERMISSION_DENIED"
          ? "Not admin of this group"
          : f.error;
        resultMsg += `  • ${f.threadName} (${f.threadID})\n    ↳ ${reason}\n`;
      });
      resultMsg += `\n`;
    }

    resultMsg += `━━━━━━━━━━━━━━━━━━━━━━━━`;

    return api.sendMessage(resultMsg, threadID);
  }

  // ────────────────────────────────────────────────
  // UNKNOWN SUBCOMMAND
  // ────────────────────────────────────────────────
  return api.sendMessage(
    `❓ Unknown subcommand: "${cmd}"\n\n` +
    `📋 Available commands:\n` +
    `  create | add | list | info\n` +
    `  delete | remove | send\n\n` +
    `Type /sendnoti for the full guide.`,
    threadID
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 HANDLE REPLY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, body } = event;
  const text = (body || "").toLowerCase().trim();

  if (text.includes("list") || text.includes("group")) {
    return api.sendMessage(
      `📋 To see your notification groups:\n/sendnoti list`,
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    `📢 Type /sendnoti to see the full command guide.`,
    threadID,
    messageID
  );
};
