const axios = require("axios");

module.exports.config = {
  name: "catbox",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Upload image to Catbox",
  commandCategory: "tools",
  usages: "reply to image or provide image URL",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID, messageReply } = event;

  let imageUrl;

  // reply to image
  if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
    imageUrl = messageReply.attachments[0].url;
  }

  // manual URL
  if (!imageUrl && args[0]) {
    imageUrl = args[0];
  }

  if (!imageUrl) {
    return api.sendMessage(
      "📌 Please reply to an image or provide an image URL.",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("⬆️ Uploading image to Catbox...", threadID, messageID);

    const api = `https://yin-api.vercel.app/tools/catbox?image=${encodeURIComponent(imageUrl)}`;

    const res = await axios.get(api);

    const data = res.data;

    // detect response
    let url;

    if (typeof data === "string") url = data;
    else url = data.url || data.result || data.link;

    if (!url) {
      console.log("Catbox API Response:", data);
      return api.sendMessage("❌ Upload failed.", threadID, messageID);
    }

    return api.sendMessage(
      `📦 Image Uploaded to Catbox\n\n🔗 ${url}`,
      threadID,
      messageID
    );

  } catch (err) {

    console.log("Catbox Error:", err.message);

    return api.sendMessage(
      "❌ Error uploading image.",
      threadID,
      messageID
    );
  }

};