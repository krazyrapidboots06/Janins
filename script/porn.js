/* ========  Porn command (updated)  ======== */
module.exports.config = {
    name: "porn",
    version: "1.2",
    hasPrefix: true,          // required – we’re sending NSFW content
    credits: "syntaxt0x1c",
    role: 2,
    description: "Send a random porn video from the public API.",
};

module.exports.run = async ({ api, event }) => {
    const axios = require("axios");

    // Tell the user we’re working on the request
    await api.setMessageReaction("⏳", event.messageID, err => {}, true);
    api.sendTypingIndicator(event.threadID, true);

    try {
        // Grab the JSON from the raw GitHub file
        const res = await axios.get(
            "https://raw.githubusercontent.com/jaydbohol-crypto/P/refs/heads/main/API/p.json"
        );

        /* --------------------------- */
        /*   Detect the payload shape   */
        /* --------------------------- */
        let videoUrl;
        let title = "Adult Video";
        let tags = "";
        let description = "";

        // 1️⃣ Modern array format
        if (Array.isArray(res.data) && res.data.length > 0) {
            const item = res.data[Math.floor(Math.random() * res.data.length)];
            if (!item.url) throw new Error("Item missing 'url' field");
            videoUrl = item.url;
            title = item.title ?? title;
            tags = Array.isArray(item.tags) ? item.tags.join(", ") : tags;
            description = item.description ?? description;
        }
        // 2️⃣ Legacy single‑object format
        else if (res.data.result && typeof res.data.result.video === "string") {
            videoUrl = res.data.result.video;
            title = "Legacy Video";
            // No tags / description available in the legacy payload
        }
        else {
            throw new Error("Unexpected JSON structure");
        }

        /* --------------------------- */
        /*   Send the results            */
        /* --------------------------- */
        // 1️⃣ Optional metadata
        await api.sendMessage(
            `🎬 ${title}\n💬 ${tags}\n📄 ${description}`,
            event.threadID
        );

        // 2️⃣ Send the video file
        await api.sendMessage(
            {
                body: "Enjoy the video 👀",
                attachment: videoUrl,
                mentions: [],
            },
            event.threadID
        );
    } catch (err) {
        console.error(err);
        await api.setMessageReaction("❌", event.messageID, true);
        return api.sendMessage(
            `❌ Failed to fetch porn video: ${err.message}`,
            event.threadID
        );
    }
};
