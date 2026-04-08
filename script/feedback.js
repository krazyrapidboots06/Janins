module.exports.config = {
  name: "feedback",
  version: "1.1.0",
  role: 0, // Added - everyone can use
  hasPermssion: 0, // Changed from hasPrefix
  credits: "selov",
  description: "Send AI feedback or bug report to admin",
  commandCategory: "utility",
  usages: "feedback [message]", // Changed from usage
  cooldowns: 5, // Changed from cooldown
  aliases: ["report", "bug"]
};

module.exports.run = async function({ api, event, args }) {
  const ADMIN_UID = "61556388598622";
  const feedbackText = args.join(" ").trim();

  if (!feedbackText) {
    return api.sendMessage(
      "❌ Please provide your feedback.\n\nExample:\nfeedback The AI answer is incorrect.",
      event.threadID,
      event.messageID
    );
  }

  try {
    const threadInfo = await api.getThreadInfo(event.threadID);
    const groupName = threadInfo?.threadName || "Private Chat";
    const isGroup = threadInfo?.isGroup || false;

    const userInfo = await api.getUserInfo(event.senderID);
    const userName = userInfo?.[event.senderID]?.name || "Unknown User";

    const reportMessage =
`🚨 AI FEEDBACK REPORT
━━━━━━━━━━━━━━━━━━━━━━
👤 User: ${userName}
🆔 User ID: ${event.senderID}

🧑‍🤝‍🧑 Chat Type: ${isGroup ? "Group Chat" : "Private Chat"}
📛 Group Name: ${isGroup ? groupName : "N/A"}
🆔 Group Thread ID: ${event.threadID}

💬 Feedback:
${feedbackText}

🕒 ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}
━━━━━━━━━━━━━━━━━━━━━━`;

    // Send to admin
    await api.sendMessage(reportMessage, ADMIN_UID);

    // Confirm to user
    api.sendMessage(
      "✅ Thank you for your feedback!\nYour report has been sent to the admin.",
      event.threadID,
      event.messageID
    );
    
  } catch (err) {
    console.error("Feedback Error:", err);
    api.sendMessage("❌ Failed to send feedback. Please try again.", event.threadID, event.messageID);
  }
};
