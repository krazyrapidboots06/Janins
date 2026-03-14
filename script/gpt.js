const axios = require("axios");

module.exports.config = {
  name: "gpt",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Chat with GPT AI",
  commandCategory: "ai",
  usages: "gpt <ask a questions>",
  cooldowns: 2
};

// Simple memory per thread
const memory = {};

// API Configuration URL
const CONFIG_URL = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  let prompt = args.join(" ").trim();

  try {
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} asked: ${prompt || "nothing"}`);

    if (!prompt) {
      return api.sendMessage(
        "📌 Please ask a question.\n\nExample: gpt what is the meaning of life?",
        threadID,
        messageID
      );
    }

    // Fetch API endpoints
    let endpoints;
    try {
      const res = await axios.get(CONFIG_URL);
      endpoints = res.data;
    } catch (e) {
      console.error("Config fetch error:", e.message);
      return api.sendMessage("❌ Failed to load API configuration.", threadID, messageID);
    }

    // List of APIs to try
    const apiList = [
      {
        url: endpoints.apiv3,
        name: "GPT-1",
        format: (p) => ({ prompt: p, max_tokens: 500 })
      },
      {
        url: `${endpoints.apiv1}/chat`,
        name: "Saim AI",
        format: (p) => ({ question: p })
      },
      {
        url: `${endpoints.apiv4}/ask`,
        name: "Goat AI",
        format: (p) => ({ query: p })
      },
      {
        url: `${endpoints.apiv5}/ai`,
        name: "ZetBot",
        format: (p) => ({ text: p })
      },
      {
        url: `${endpoints.gist}/chat`,
        name: "Gist AI",
        format: (p) => ({ message: p })
      }
    ];

    let responseText = null;
    let usedAPI = "";

    // Try each API
    for (const api of apiList) {
      try {
        console.log(`Trying ${api.name}...`);
        
        const res = await axios.post(api.url, api.format(prompt), {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });

        // Extract response from various formats
        const data = res.data;
        
        if (typeof data === 'string') {
          responseText = data;
        } else if (data.response) {
          responseText = data.response;
        } else if (data.message) {
          responseText = data.message;
        } else if (data.answer) {
          responseText = data.answer;
        } else if (data.text) {
          responseText = data.text;
        } else if (data.content) {
          responseText = data.content;
        } else if (data.result) {
          responseText = data.result;
        } else if (data.reply) {
          responseText = data.reply;
        } else if (data.generated_text) {
          responseText = data.generated_text;
        } else if (data.output) {
          responseText = data.output;
        } else if (data.choices?.[0]?.text) {
          responseText = data.choices[0].text;
        } else if (data.choices?.[0]?.message?.content) {
          responseText = data.choices[0].message.content;
        }

        if (responseText) {
          usedAPI = api.name;
          break;
        }
      } catch (err) {
        console.log(`${api.name} failed:`, err.message);
        continue;
      }
    }

    if (!responseText) {
      return api.sendMessage("❌ No AI service responded. Try again later.", threadID, messageID);
    }

    // Store in memory
    memory[threadID].push(`GPT response from ${usedAPI}`);

    // Send response
    return api.sendMessage(
      `🤖 GPT (${usedAPI})\n━━━━━━━━━━━━━━\n${responseText}`,
      threadID,
      messageID
    );

  } catch (err) {
    console.error("GPT Command Error:", err);
    return api.sendMessage(
      `❌ Error: ${err.message}`,
      threadID,
      messageID
    );
  }
};
