const axios = require("axios");
const fs = require("fs-extra");

const CONFIG_URL = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";

async function getApiEndpoints() {
  try {
    const res = await axios.get(CONFIG_URL);
    return res.data;
  } catch (error) {
    console.error("Failed to fetch API config:", error.message);
    throw new Error("Could not load API configuration");
  }
}

module.exports = {
  config: {
    name: "gpt",
    version: "1.0",
    author: "System",
    countDown: 3,
    role: 0,
    shortDescription: "Chat with GPT AI",
    longDescription: "Generate text using multiple GPT APIs",
    guide: "{p}gpt <prompt>"
  },

  onStart: async function ({ api, event, args, message }) {
    const prompt = args.join(" ").trim();

    if (!prompt) {
      return message.reply(
        "❌ Please provide a prompt.\n\n**Example:**\n/gpt what is the meaning of life?"
      );
    }

    let endpoints;
    try {
      endpoints = await getApiEndpoints();
    } catch (e) {
      return message.reply("❌ Failed to load API configuration.");
    }

    const apiCandidates = [
      { url: endpoints.apiv3, name: "GPT API", format: (p) => ({ prompt: p, max_tokens: 500 }) },
      { url: endpoints.apiv1, name: "Saim API", format: (p) => ({ question: p, temperature: 0.7 }) },
      { url: endpoints.apiv4, name: "Free Goat API", format: (p) => ({ query: p, stream: false }) },
      { url: `${endpoints.gist}/chat`, name: "Gist API", format: (p) => ({ message: p, history: [] }) },
      { url: endpoints.apiv5, name: "ZetBot API", format: (p) => ({ text: p, model: "default" }) }
    ];

    const processingMsg = await message.reply("🤖 GPT is thinking...");
    let lastError = null;

    for (const api of apiCandidates) {
      try {
        const endpointsToTry = [
          api.url,
          `${api.url}/generate`,
          `${api.url}/chat`,
          `${api.url}/api/generate`,
          `${api.url}/v1/completions`
        ];

        for (const endpoint of endpointsToTry) {
          try {
            const response = await axios.post(endpoint, api.format(prompt), {
              timeout: 30000,
              headers: { 'Content-Type': 'application/json' }
            });

            let responseText = null;
            const data = response.data;

            if (typeof data === 'string') responseText = data;
            else if (data.response) responseText = data.response;
            else if (data.message) responseText = data.message;
            else if (data.answer) responseText = data.answer;
            else if (data.text) responseText = data.text;
            else if (data.content) responseText = data.content;
            else if (data.generated_text) responseText = data.generated_text;
            else if (data.output) responseText = data.output;
            else if (data.result) responseText = data.result;
            else if (data.data?.text) responseText = data.data.text;
            else if (data.choices?.[0]?.text) responseText = data.choices[0].text;
            else if (data.choices?.[0]?.message?.content) responseText = data.choices[0].message.content;

            if (responseText) {
              await api.unsendMessage(processingMsg.messageID);
              return message.reply(`🤖 **GPT Response**\n━━━━━━━━━━━━━━━━\n${responseText}\n━━━━━━━━━━━━━━━━\n⚡ API: ${api.name}`);
            }
          } catch (e) {}
        }
      } catch (err) {
        lastError = err;
      }
    }

    await api.unsendMessage(processingMsg.messageID);
    return message.reply("❌ All GPT APIs failed. Please try again later.");
  }
};
