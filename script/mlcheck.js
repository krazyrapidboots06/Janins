const axios = require('axios');

module.exports.config = {
  name: "mlcheck",
  version: "1.0.0",
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
      "Example: /mlcheck 2002113712 19417",
      threadID,
      messageID
    );
  }
  
  const waitingMsg = await api.sendMessage(`🔍 Checking account: ${userId} (Zone ${zoneId})...`, threadID);
  
  try {
    // PuruBoy API - POST method
    const response = await axios.post('https://puruboy-api.vercel.app/api/tools/mlbb', {
      userId: userId,
      zoneId: zoneId
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = response.data;
    
    if (!data.success) {
      throw new Error(data.message || "Account not found");
    }
    
    const result = data.result;
    
    const resultMsg = 
      `🎮 MLBB ACCOUNT DETAILS\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📊 User ID: ${userId}\n` +
      `🌍 Zone ID: ${zoneId}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `👤 Nickname: ${result.nickname || 'N/A'}\n` +
      `🌏 Region: ${result.region || 'N/A'}\n` +
      `📅 Last Login: ${result.lastLogin || 'N/A'}\n` +
      `🕐 Created: ${result.createdAt || 'N/A'}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🔍 Checked by: Selov`;
    
    await api.editMessage(resultMsg, waitingMsg.messageID);
    
  } catch (err) {
    console.error("MLBB Check Error:", err);
    
    let errorMsg = 
      `❌ MLBB Check Failed\n━━━━━━━━━━━━━━━━\n` +
      `📊 User ID: ${userId}\n` +
      `🌍 Zone ID: ${zoneId}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🔴 Error: ${err.message}\n\n` +
      `💡 The API service may be temporarily unavailable.\n` +
      `Please try again later.`;
    
    await api.editMessage(errorMsg, waitingMsg.messageID);
  }
};
