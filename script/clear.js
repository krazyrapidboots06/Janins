const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "clear",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Unblur / enhance an image",
  commandCategory: "tools",
  usages: "reply clear to an image",
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

  const attachment = messageReply.attachments.find(a => a.type === "photo");

  if (!attachment) {
    return api.sendMessage(
      "❌ The replied message is not an image.",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("🧹 Clearing the image... please wait.", threadID, messageID);

    const imageUrl = attachment.url;

    const apiUrl = `https://yin-api.vercel.app/tools/unblur?url=${encodeURIComponent(imageUrl)}`;

    const res = await axios.get(apiUrl);

    const data = res.data;

    const clearImageUrl =
      data.url ||
      data.result ||
      data.image ||
      data;

    if (!clearImageUrl) {
      console.log("API RESPONSE:", data);
      return api.sendMessage("❌ Failed to clear image.", threadID, messageID);
    }

    const img = await axios.get(clearImageUrl, { responseType: "arraybuffer" });

    const filePath = path.join(__dirname, "cache", `clear_${Date.now()}.jpg`);

    fs.writeFileSync(filePath, Buffer.from(img.data));

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

    api.sendMessage(
      "❌ Failed to clear the image.",
      threadID,
      messageID
    );

  }

};