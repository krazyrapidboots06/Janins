"use strict";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ COMMAND CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.config = {
  name: "sendnoti",
  version: "1.5.0",
  role: 3,
  credits: " (ported by selov)",
  description: "Create and send notifications to groups that you manage.",
  commandCategory: "box chat",
  usages: "/sendnoti <create | add | delete | remove | list | info | send> [args]",
  cooldowns: 5,
  aliases: ["noti", "groupnoti"]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 LANGUAGE STRINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const lang = {
  missingGroupName:        "❌ Please enter a group notification name.",
  groupNameExists:         "❌ Notification group \"%1\" already exists. Please choose another name.",
  createdGroup:            "✅ Created notification group successfully!\n━━━━━━━━━━━━━━━\n📛 Name : %1\n🆔 ID   : %2",
  missingGroupNameToAdd:   "❌ Please enter the notification group name you want to add this chat to.",
  groupNameNotExists:      "❌ You have not created/managed any notification group named: \"%1\"",
  notAdmin:                "❌ You are not an admin of this group chat.",
  added:                   "✅ Added current group chat to notification group: \"%1\"",
  missingGroupNameToDelete:"❌ Please enter the notification group name to remove this chat from.",
  notInGroup:              "❌ This group chat is not in notification group \"%1\".",
  emptyList:               "📭 You have not created or managed any notification group yet.",
  showList:                "📋 Your notification groups:\n(Format: <Name> — <No. of chats>)\n━━━━━━━━━━━━━━━\n%1",
  deleted:                 "✅ Removed current group chat from notification group: \"%1\"",
  failed:                  "❌ Failed to send to %1 group chat(s):\n%2",
  missingGroupNameToRemove:"❌ Please enter the notification group name you want to delete.",
  removed:                 "🗑️ Deleted notification group: \"%1\"",
  missingGroupNameToSend:  "❌ Please enter the notification group name you want to send to.",
  groupIsEmpty:            "📭 Notification group \"%1\" has no group chats yet.",
  sending:                 "📡 Sending notification to %1 group chat(s) in group \"%2\"...",
  success:                 "✅ Notification sent to %1 group chat(s) in \"%2\" successfully!",
  notAdminOfGroup:         "Permission denied (not admin of group)",
  missingGroupNameToView:  "❌ Please enter the notification group name you want to view.",
  groupInfo:               "📋 GROUP INFO\n━━━━━━━━━━━━━━━\n📛 Name    : %1\n🆔 ID      : %2\n📅 Created : %3\n%4",
  groupInfoHasGroup:       "💬 Group Chats:\n%1",
  noGroup:                 "📭 You have not created or managed any notification group yet."
};

// Simple string formatter: replaces %1, %2, ... with values
function L(key, ...vars) {
  let str = lang[key] || key;
  vars.forEach((v, i) => { str = str.replace(`%${i + 1}`, v); });
  return str;
}

// Format timestamp from groupID (epoch ms)
function formatTime(ms) {
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 DATA STORE (in-memory, persisted via global)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// global.sendNotiData = { [senderID]: [ { groupName, groupID, threadIDs[] }, ... ] }
if (!global.sendNotiData) global.sendNotiData = {};

function getUserGroups(senderID) {
  if (!global.sendNotiData[senderID]) global.sendNotiData[senderID] = [];
  return global.sendNotiData[senderID];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 MAIN RUN FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const sub = (args[0] || "").toLowerCase().trim();
  const userGroups = getUserGroups(senderID);

  // ── NO ARGS: SHOW HELP ──────────────────────────────
  if (!sub) {
    return api.sendMessage(
      `📢 SEND NOTI COMMAND\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Manage and broadcast notifications to multiple group chats.\n\n` +
      `📌 COMMANDS:\n\n` +
      `▸ /sendnoti create <name>\n` +
      `  Create a new notification group\n\n` +
      `▸ /sendnoti add <name>\n` +
      `  Add current chat to a noti group\n` +
      `  (Must be group admin)\n\n` +
      `▸ /sendnoti delete <name>\n` +
      `  Remove current chat from a noti group\n\n` +
      `▸ /sendnoti remove <name>\n` +
      `  Permanently delete a noti group\n\n` +
      `▸ /sendnoti list\n` +
      `  View all your noti groups\n\n` +
      `▸ /sendnoti info <name>\n` +
      `  View details of a noti group\n\n` +
      `▸ /sendnoti send <name> | <message>\n` +
      `  Broadcast a message to all chats\n` +
      `  in the noti group\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      threadID,
      messageID
    );
  }

  // ── CREATE ──────────────────────────────────────────
  if (sub === "create") {
    const groupName = args.slice(1).join(" ").trim();
    if (!groupName)
      return api.sendMessage(L("missingGroupName"), threadID, messageID);

    if (userGroups.some(g => g.groupName === groupName))
      return api.sendMessage(L("groupNameExists", groupName), threadID, messageID);

    const groupID = Date.now();
    userGroups.push({ groupName, groupID, threadIDs: [] });

    return api.sendMessage(L("createdGroup", groupName, groupID), threadID, messageID);
  }

  // ── ADD ─────────────────────────────────────────────
  if (sub === "add") {
    const groupName = args.slice(1).join(" ").trim();
    if (!groupName)
      return api.sendMessage(L("missingGroupNameToAdd"), threadID, messageID);

    const group = userGroups.find(g => g.groupName === groupName);
    if (!group)
      return api.sendMessage(L("groupNameNotExists", groupName), threadID, messageID);

    // Check if sender is admin of current thread
    let isAdmin = false;
    try {
      const threadInfo = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (err, info) => err ? rej(err) : res(info))
      );
      isAdmin = (threadInfo?.adminIDs || []).some(a => (a.id || a) == senderID);
    } catch (_) {
      isAdmin = false;
    }

    if (!isAdmin)
      return api.sendMessage(L("notAdmin"), threadID, messageID);

    if (group.threadIDs.includes(threadID))
      return api.sendMessage(
        `⚠️ This chat is already in notification group "${groupName}".`,
        threadID,
        messageID
      );

    group.threadIDs.push(threadID);
    return api.sendMessage(L("added", groupName), threadID, messageID);
  }

  // ── DELETE (remove current chat from group) ─────────
  if (sub === "delete") {
    const groupName = args.slice(1).join(" ").trim();
    if (!groupName)
      return api.sendMessage(L("missingGroupNameToDelete"), threadID, messageID);

    const group = userGroups.find(g => g.groupName === groupName);
    if (!group)
      return api.sendMessage(L("groupNameNotExists", groupName), threadID, messageID);

    const idx = group.threadIDs.indexOf(threadID);
    if (idx === -1)
      return api.sendMessage(L("notInGroup", groupName), threadID, messageID);

    group.threadIDs.splice(idx, 1);
    return api.sendMessage(L("deleted", groupName), threadID, messageID);
  }

  // ── REMOVE (delete entire noti group) ───────────────
  if (sub === "remove" || sub === "-r") {
    const groupName = args.slice(1).join(" ").trim();
    if (!groupName)
      return api.sendMessage(L("missingGroupNameToRemove"), threadID, messageID);

    const idx = userGroups.findIndex(g => g.groupName === groupName);
    if (idx === -1)
      return api.sendMessage(L("groupNameNotExists", groupName), threadID, messageID);

    userGroups.splice(idx, 1);
    return api.sendMessage(L("removed", groupName), threadID, messageID);
  }

  // ── LIST ────────────────────────────────────────────
  if (sub === "list") {
    if (!userGroups.length)
      return api.sendMessage(L("noGroup"), threadID, messageID);

    const lines = userGroups.map(g =>
      `▸ ${g.groupName} — ${g.threadIDs.length} chat(s)`
    ).join("\n");

    return api.sendMessage(L("showList", lines), threadID, messageID);
  }

  // ── INFO ────────────────────────────────────────────
  if (sub === "info") {
    const groupName = args.slice(1).join(" ").trim();
    if (!groupName)
      return api.sendMessage(L("missingGroupNameToView"), threadID, messageID);

    const group = userGroups.find(g => g.groupName === groupName);
    if (!group)
      return api.sendMessage(L("groupNameNotExists", groupName), threadID, messageID);

    let chatLines = "";
    for (const tid of group.threadIDs) {
      let name = "Unknown";
      try {
        const info = await new Promise((res, rej) =>
          api.getThreadInfo(tid, (err, i) => err ? rej(err) : res(i))
        );
        name = info?.threadName || "Unknown";
      } catch (_) {}
      chatLines += ` ▸ ID: ${tid}\n   Name: ${name}\n\n`;
    }

    const hasChats = chatLines
      ? L("groupInfoHasGroup", chatLines)
      : L("groupIsEmpty", groupName);

    return api.sendMessage(
      L("groupInfo", groupName, group.groupID, formatTime(group.groupID), hasChats),
      threadID,
      messageID
    );
  }

  // ── SEND ────────────────────────────────────────────
  if (sub === "send") {
    const rest = args.slice(1).join(" ");
    const pipeIdx = rest.indexOf("|");

    if (pipeIdx === -1) {
      return api.sendMessage(
        `❌ Invalid format!\n\n` +
        `📌 Usage:\n` +
        `/sendnoti send <groupName> | <message>\n\n` +
        `📖 Example:\n` +
        `/sendnoti send TEAM1 | Hello everyone!`,
        threadID,
        messageID
      );
    }

    const groupName = rest.slice(0, pipeIdx).trim();
    const messageBody = rest.slice(pipeIdx + 1).trim();

    if (!groupName)
      return api.sendMessage(L("missingGroupNameToSend"), threadID, messageID);

    const group = userGroups.find(g => g.groupName === groupName);
    if (!group)
      return api.sendMessage(L("groupNameNotExists", groupName), threadID, messageID);

    if (group.threadIDs.length === 0)
      return api.sendMessage(L("groupIsEmpty", groupName), threadID, messageID);

    // Build message form
    const formSend = { body: messageBody || "" };

    // Handle attachments from sender's message or replied message
    const allAttachments = [
      ...(event.attachments || []),
      ...(event.messageReply?.attachments || [])
    ].filter(a => ["photo", "png", "animated_image", "video", "audio"].includes(a.type));

    if (allAttachments.length > 0) {
      try {
        const axios = require("axios");
        const streams = await Promise.all(
          allAttachments.map(att =>
            axios.get(att.url, { responseType: "stream", timeout: 10000 }).then(r => r.data)
          )
        );
        formSend.attachment = streams;
      } catch (_) {
        // Proceed without attachment if fetch fails
      }
    }

    const { threadIDs } = group;

    // Show sending status
    const loadMsg = await api.sendMessage(
      L("sending", threadIDs.length, groupName),
      threadID
    );

    const success = [];
    const failed  = [];

    for (const tid of threadIDs) {
      await new Promise(r => setTimeout(r, 1000)); // Prevent rate limiting

      try {
        // Check if sender is admin of the target thread
        let isAdmin = false;
        try {
          const info = await new Promise((res, rej) =>
            api.getThreadInfo(tid, (err, i) => err ? rej(err) : res(i))
          );
          isAdmin = (info?.adminIDs || []).some(a => (a.id || a) == senderID);
          if (!isAdmin) throw { error: "PERMISSION_DENIED", threadName: info?.threadName };
        } catch (e) {
          if (e?.error === "PERMISSION_DENIED") throw e;
          throw { error: "THREAD_FETCH_FAILED", threadName: "Unknown" };
        }

        await new Promise((res, rej) =>
          api.sendMessage(formSend, tid, (err) => err ? rej({ error: err, tid }) : res())
        );

        success.push(tid);
      } catch (err) {
        failed.push({
          tid,
          threadName: err?.threadName || "Unknown",
          error: err?.error || "UNKNOWN"
        });
      }
    }

    // Remove loading message
    try { await api.unsendMessage(loadMsg.messageID); } catch (_) {}

    // Build result message
    let resultMsg = "";

    if (success.length)
      resultMsg += L("success", success.length, groupName) + "\n";

    if (failed.length) {
      const failDetails = failed.map(f =>
        `\n▸ ID: ${f.tid}\n  Name: ${f.threadName}\n  Error: ${f.error === "PERMISSION_DENIED" ? L("notAdminOfGroup") : f.error}`
      ).join("\n");
      resultMsg += L("failed", failed.length, failDetails);
    }

    return api.sendMessage(resultMsg.trim(), threadID, messageID);
  }

  // ── UNKNOWN SUBCOMMAND ───────────────────────────────
  return api.sendMessage(
    `❓ Unknown subcommand: "${sub}"\n\n` +
    `Type /sendnoti to see all available commands.`,
    threadID,
    messageID
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 HANDLE REPLY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, body } = event;
  const text = (body || "").toLowerCase().trim();

  if (text.includes("create") || text.includes("how")) {
    return api.sendMessage(
      `📌 To create a notification group:\n` +
      `/sendnoti create <groupName>\n\n` +
      `Example:\n` +
      `/sendnoti create TEAM1`,
      threadID,
      messageID
    );
  }

  if (text.includes("send") || text.includes("broadcast")) {
    return api.sendMessage(
      `📌 To broadcast a message:\n` +
      `/sendnoti send <groupName> | <message>\n\n` +
      `Example:\n` +
      `/sendnoti send TEAM1 | Good morning everyone!`,
      threadID,
      messageID
    );
  }

  return api.sendMessage(
    `📢 Type /sendnoti to see all available commands.`,
    threadID,
    messageID
  );
};
