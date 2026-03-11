const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "clear",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Unblur / enhance an image",
  commandCategory: "tools",
  usages: "reply to an image",
  cooldowns: 3
};

module.exports.run = async function ({ api, event }) {

  const { threadID, messageID, messageReply } = event;

  if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
    return api.sendMessage(
      "📌 Please reply to an image you want to clear.",
      threadID,
      messageID
    );
  }

  const attachment = messageReply.attachments[0];

  if (attachment.type !== "photo") {
    return api.sendMessage(
      "❌ Please reply to a valid image.",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("🧹 Clearing the image... please wait.", threadID, messageID);

    const imgUrl = attachment.url;

    const apiUrl = `https://yin-api.vercel.app/tools/unblur?url=${encodeURIComponent(imgUrl)}`;

    const img = await axios.get(apiUrl, {
      responseType: "arraybuffer"
    });

    const filePath = path.join(__dirname, "cache", `clear_${Date.now()}.jpg`);

    fs.writeFileSync(filePath, img.data);

    api.sendMessage(
      {
        body: "✨ Here is the cleared image:",
        attachment: fs.createReadStream(filePath)
      },
      threadID,
      () => fs.unlinkSync(filePath),
      messageID
    );

  } catch (err) {

    console.error("Clear Error:", err);

    return api.sendMessage(
      "❌ Failed to clear the image.",
      threadID,
      messageID
    );
  }

};