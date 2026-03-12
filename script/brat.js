const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "brat",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Generate image from text using Brat API",
  commandCategory: "ai",
  usages: "brat <text>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const text = args.join(" ");

  if (!text) {
    return api.sendMessage(
      "🖼 Please provide text to generate an image.\n\nExample:\n brat hello world",
      threadID,
      messageID
    );
  }

  try {
    api.sendMessage("🎨 Generating image from text... please wait.", threadID, messageID);

    const apiUrl = `https://deku-api.giize.com/gen/brat?text=${encodeURIComponent(text)}`;
    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.image) {
      return api.sendMessage("❌ Failed to generate image.", threadID, messageID);
    }

    const imageUrl = res.data.image;
    const imgPath = path.join(__dirname, "cache", `brat_${Date.now()}.jpg`);
    const imgData = await axios.get(imageUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(imgPath, imgData.data);

    api.sendMessage(
      {
        body: `🖼 Brat image for:\n${text}`,
        attachment: fs.createReadStream(imgPath)
      },
      threadID,
      () => fs.unlinkSync(imgPath),
      messageID
    );

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Error generating image.", threadID, messageID);
  }
};