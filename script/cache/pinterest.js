const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "pinterest",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Search and download images from Pinterest",
  commandCategory: "search",
  usages: "pinterest <query>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID } = event;
  const query = args.join(" ");

  if (!query) {
    return api.sendMessage(
      "📌 Please enter a search query.\n\nExample:\n pinterest cat",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("🔍 Searching Pinterest... please wait.", threadID, messageID);

    const apiUrl = `https://deku-api.giize.com/search/pinterest?q=${encodeURIComponent(query)}`;

    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.status || !res.data.result.result.pins || res.data.result.result.pins.length === 0) {
      return api.sendMessage("❌ No images found for your search.", threadID, messageID);
    }

    const pins = res.data.result.result.pins.slice(0, 10);
    const attachments = [];
    const imgPaths = [];

    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i];
      const imageUrl = pin.media.images.large.url;
      const title = pin.title || "No title";
      const uploader = pin.uploader.full_name || pin.uploader.username;

      const imgPath = path.join(__dirname, "cache", `pinterest_${Date.now()}_${i}.jpg`);

      try {
        const img = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 10000 });
        fs.writeFileSync(imgPath, img.data);
        attachments.push(fs.createReadStream(imgPath));
        imgPaths.push(imgPath);
      } catch (imgErr) {
        console.error(`Failed to download image ${i + 1}:`, imgErr.message);
      }
    }

    if (attachments.length === 0) {
      return api.sendMessage("❌ Failed to download images.", threadID, messageID);
    }

    api.sendMessage(
      {
        body: `📌 Pinterest Search Results for: "${query}"\n\nTotal images: ${attachments.length}`,
        attachment: attachments
      },
      threadID,
      () => {
        imgPaths.forEach(imgPath => {
          try {
            fs.unlinkSync(imgPath);
          } catch (e) {
            console.error(`Failed to delete ${imgPath}:`, e.message);
          }
        });
      },
      messageID
    );

  } catch (err) {

    console.error(err);

    api.sendMessage(
      "❌ Error searching Pinterest.",
      threadID,
      messageID
    );
  }

};