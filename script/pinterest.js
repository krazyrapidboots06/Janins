const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "pinterest",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Search Pinterest images",
  commandCategory: "media",
  usages: "pinterest <query> [limit]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID } = event;

  if (!args.length) {
    return api.sendMessage(
      "📌 Example:\npinterest cat 5",
      threadID,
      messageID
    );
  }

  let limit = 5;
  const lastArg = args[args.length - 1];

  if (!isNaN(lastArg)) {
    limit = parseInt(lastArg);
    args.pop();
  }

  if (limit > 20) limit = 20;
  if (limit < 1) limit = 1;

  const query = args.join(" ");

  try {

    api.sendMessage("📌 Searching Pinterest...", threadID, messageID);

    const url = `https://deku-api.giize.com/search/pinterest?q=${encodeURIComponent(query)}`;

    const res = await axios.get(url);

    const pins = res.data.result.result.pins;

    if (!pins || pins.length === 0) {
      return api.sendMessage("❌ No results found.", threadID, messageID);
    }

    const attachments = [];

    for (let i = 0; i < Math.min(limit, pins.length); i++) {

      const imgUrl = pins[i].media.images.large.url;

      const imgPath = path.join(__dirname, "cache", `pin_${Date.now()}_${i}.jpg`);

      const img = await axios.get(imgUrl, { responseType: "arraybuffer" });

      fs.writeFileSync(imgPath, img.data);

      attachments.push(fs.createReadStream(imgPath));

    }

    api.sendMessage(
      {
        body: `📌 Pinterest results for "${query}"\nImages: ${attachments.length}`,
        attachment: attachments
      },
      threadID,
      () => {
        attachments.forEach(file => fs.unlinkSync(file.path));
      },
      messageID
    );

  } catch (err) {

    console.error(err);

    api.sendMessage(
      "❌ Failed to fetch Pinterest images.",
      threadID,
      messageID
    );

  }

};