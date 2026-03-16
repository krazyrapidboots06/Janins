const axios = require('axios');

module.exports.config = {
  name: "sms",
  version: "1.0.0",
  role: 2,
  credits: "selov",
  description: "Send SMS to phone numbers",
  commandCategory: "utility",
  usages: "/sms <phone> <message>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  
  try {
    const phone = args[0];
    const message = args.slice(1).join(" ");
    
    if (!phone || !message) {
      return api.sendMessage(
        "❌ Usage: /sms <phone> <message>\nExample: /sms 09450807xxx Hello world",
        threadID,
        messageID
      );
    }
    
    const waiting = await api.sendMessage("📱 Sending SMS...", threadID);
    
    // Using a free SMS API (you'll need to find a working one)
    // Option 1: TextBelt (free tier limited)
    const response = await axios.post('https://textbelt.com/text', {
      phone: phone,
      message: message,
      key: 'textbelt' // Free key - limited to 1 per day
    });
    
    if (response.data.success) {
      api.editMessage(
        `✅ **SMS Sent Successfully**\n━━━━━━━━━━━━━━━━\n📞 To: ${phone}\n💬 Message: ${message}\n📊 Remaining: ${response.data.quotaRemaining}`,
        waiting.messageID
      );
    } else {
      api.editMessage(`❌ Failed: ${response.data.error}`, waiting.messageID);
    }
    
  } catch (err) {
    console.error("SMS Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
