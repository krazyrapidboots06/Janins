/* =========================================================
   katorsex command – fetches a random entry from
   https://betadash-api-swordslush-production.up.railway.app/katorsex?page=1
   ============================================================== */
module.exports.config = {
    name: "katosex",
    version: "1.1",
    hasPrefix: true,                // <‑ works with !katosex …
    credits: "selov",
    role: 2,                        // only users with role ≥ 2 can use it
    description: "Get a random katorsex entry from the BetaDash API (text + image + video)."
};

module.exports.run = async ({ api, event, args }) => {
    const axios = require("axios");

    // ------------------------------------------------------------------
    // helper: normalise the API response
    const parseResponse = data => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.results)) return data.results;
        throw new Error("Unexpected API format");
    };

    // ------------------------------------------------------------------
    // quick reaction so the user knows we’re busy
    try { api.setMessageReaction("⏳", event.messageID, () => {}, true); } catch (_) {}

    try {
        // 1️⃣  read page number (default 1)
        const page = args[0] ? parseInt(args[0], 10) : 1;
        if (isNaN(page) || page < 1) throw new Error("Page must be ≥ 1");

        // 2️⃣  fetch JSON
        const { data: raw } = await axios.get(
            `https://betadash-api-swordslush-production.up.railway.app/katorsex?page=${page}`,
            { timeout: 20000 }
        );

        const items = parseResponse(raw);
        if (!items.length) throw new Error("No entries returned");

        // 3️⃣  pick random item
        const entry = items[Math.floor(Math.random() * items.length)];
        const { title = "Untitled", description = "", imageUrl = "", videoUrl = "" } = entry;

        // 4️⃣  build the message body
        const body = `🎯 ${title}\n\n${description}`;

        // 5️⃣  prepare attachment(s)
        let attachment = null;

        if (videoUrl) {
            // Prefer video if present – videos are usually larger but you can swap logic
            const video = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 20000 });
            attachment = Buffer.from(video.data);          // <‑ mp4 / webm / … (any uploadable type)
        } else if (imageUrl) {
            const img = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 20000 });
            attachment = Buffer.from(img.data);
        }

        // 6️⃣  send the message
        if (attachment) {
            await api.sendMessage(
                { body, attachment },
                event.threadID
            );
        } else {
            await api.sendMessage(body, event.threadID);
        }

        // 7️⃣  success reaction
        try { api.setMessageReaction("✅", event.messageID); } catch (_) {}
    } catch (err) {
        console.error("[katosex] ", err);
        try { api.setMessageReaction("❌", event.messageID); } catch (_) {}
        api.sendMessage(`❌ katorsex error: ${err.message}`, event.threadID);
    }
};
