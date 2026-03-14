module.exports.config = {
    name: "porn",
    version: "1.0", 
    role: 0,
    credits: "syntaxt0x1c",
    description: "Find and download a PornHub video.",
};

module.exports.run = async ({ api, event }) => {
    const axios = require("axios");
    
    try {
        // Get the API response with timeout protection
        const { data } = await axios.get(
            `https://betadash-api-swordslush-production.up.railway.app/pornhub?apikey=shipazu`,
            { timeout: 15000 }
        );
        
        if (!data || !Array.isArray(data) || !data.length) {
            return api.sendMessage("No videos available in response.", event.threadID);
        }

        // Find the first valid video link
        let bestLink = null;
        for (const item of data) {
            if (item.link && typeof item.link === 'string') {
                try {
                    await axios.head(item.link, { timeout: 5000 });
                    bestLink = item.link; 
                    break;
                } catch (_) {}
            }
        }

        if (!bestLink) {
            return api.sendMessage("No working video link found.", event.threadID);
        }

        // Stream the download directly to disk
        const path = `${__dirname}/cache/porn_${Date.now()}.mp4`;
        
        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(path);

            axios({
                url: bestLink,
                method: 'GET',
                responseType: 'stream',
                timeout: 20000
            })
            .then(response => response.data.pipe(writer))
            .catch(reject);
            
            // Cleanup if download fails midway
            writer.on('error', reject);
        });

        // Send the video back to chat with metadata
        api.sendMessage({
            body: `PornHub Video (${data.length} results returned)`,
            attachment: fs.createReadStream(path)
        }, event.threadID);

        // Clean up after sending
        setTimeout(() => {
            if (fs.existsSync(path)) {
                try { fs.unlinkSync(path); } catch (_) {}
            }
        }, 5000);
        
    } catch (err) {
        console.error("[porn] Error:", err.message);
        api.sendMessage(`Error fetching video: ${err.message}`, event.threadID);
    }
};
