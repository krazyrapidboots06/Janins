const axios = require('axios');

module.exports.config = {
  name: "mlcheck",
  version: "3.0.0",
  role: 0,
  credits: "selov",
  description: "Check Mobile Legends account details",
  commandCategory: "game",
  usages: "/mlcheck <userid> <zoneid>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  
  const userId = args[0];
  const zoneId = args[1];
  
  if (!userId || !zoneId) {
    return api.sendMessage(
      "🎮 MLBB ACCOUNT CHECKER\n━━━━━━━━━━━━━━━━\n" +
      "Usage: /mlcheck <userid> <zoneid>\n\n" +
      "Example: /mlcheck 997476984 10978\n\n" +
      "Find your User ID and Zone ID in your MLBB profile.",
      threadID,
      messageID
    );
  }
  
  // Validate IDs are numbers
  if (isNaN(userId) || isNaN(zoneId)) {
    return api.sendMessage("❌ User ID and Zone ID must be numbers.", threadID, messageID);
  }
  
  const waitingMsg = await api.sendMessage(`🔍 Checking account: ${userId} (Zone ${zoneId})...`, threadID);
  
  try {
    // Try PuruBoy API
    let data = null;
    
    try {
      const response = await axios.post('https://puruboy-api.vercel.app/api/tools/mlbb', {
        userId: userId,
        zoneId: zoneId
      }, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });
      data = response.data;
    } catch (err) {
      console.log("PuruBoy API failed:", err.message);
    }
    
    // Alternative API if first fails
    if (!data || !data.success) {
      try {
        const altResponse = await axios.get(`https://api.diioffc.web.id/api/mlbb/${userId}/${zoneId}`, {
          timeout: 10000
        });
        data = altResponse.data;
      } catch (err) {
        console.log("Alternative API failed:", err.message);
      }
    }
    
    // Check if we got valid data
    if (!data) {
      throw new Error("All APIs failed");
    }
    
    // Extract result from different response structures
    const result = data.result || data.data || data;
    
    // Get values with fallbacks
    const nickname = result.nickname || result.name || result.username || "N/A";
    const region = result.region || result.country || "N/A";
    const lastLogin = result.lastLogin || result.last_login || result.last_active || "N/A";
    const createdAt = result.createdAt || result.created_at || result.join_date || "N/A";
    
    // Check if account exists
    if (nickname === "N/A" && region === "N/A") {
      throw new Error("Account not found");
    }
    
    // Format the response
    const resultMsg = 
      `🎮 MLBB ACCOUNT DETAILS\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📊 User ID: ${userId}\n` +
      `🌍 Zone ID: ${zoneId}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `👤 Nickname: ${nickname}\n` +
      `🌏 Region: ${region}\n` +
      `📅 Last Login: ${lastLogin}\n` +
      `🕐 Created: ${createdAt}`;
    
    await api.editMessage(resultMsg, waitingMsg.messageID);
    
  } catch (err) {
    console.error("MLBB Check Error:", err);
    
    let errorMsg = 
      `❌ MLBB Check Failed\n━━━━━━━━━━━━━━━━\n` +
      `📊 User ID: ${userId}\n` +
      `🌍 Zone ID: ${zoneId}\n` +
      `━━━━━━━━━━━━━━━━\n`;
    
    if (err.message === "Account not found" || err.message === "All APIs failed") {
      errorMsg += `🔴 Account not found\n\n` +
                  `💡 **Possible reasons:**\n` +
                  `• Invalid User ID or Zone ID\n` +
                  `• Account does not exist\n` +
                  `• Account is private`;
    } else if (err.code === 'ECONNABORTED') {
      errorMsg += `🔴 Request Timed Out\n\n` +
                  `💡 The server took too long to respond.\n` +
                  `Please try again later.`;
    } else {
      errorMsg += `🔴 Error: ${err.message}\n\n` +
                  `💡 API service may be temporarily down.\n` +
                  `Please try again later.`;
    }
    
    await api.editMessage(errorMsg, waitingMsg.messageID);
  }
};
