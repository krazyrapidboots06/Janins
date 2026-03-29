const axios = require('axios');

module.exports.config = {
  name: "aiv2",
  version: "1.0.0",
  role: 0,
  credits: "selov",
  description: "AI-powered Bible study assistant with empathetic responses",
  commandCategory: "ai",
  usages: "/aiv2 <question>",
  cooldowns: 3,
  aliases: ["bibleai2", "veniceai"]
};

// Store user conversation history
if (!global.aiv2Users) global.aiv2Users = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const userQuestion = args.join(" ").trim();

  if (!userQuestion) {
    return api.sendMessage(
      `📖 Bible AI\n━━━━━━━━━━━━━━━━\n` +
      `Ask me anything about the Bible!\n\n` +
      `Examples:\n` +
      `• /aiv2 What does the Bible say about forgiveness?\n` +
      `• /aiv2 Explain John 3:16\n` +
      `• /aiv2 Nagkasala ako, ano ang gagawin ko?\n` +
      `• /aiv2 I'm feeling sad`,
      threadID,
      messageID
    );
  }

  // Initialize user memory if not exists
  if (!global.aiv2Users[senderID]) {
    global.aiv2Users[senderID] = {
      history: [],
      lastQuestion: null
    };
  }

  // Get user info for personalization
  let userName = "kaibigan";
  try {
    const userInfo = await api.getUserInfo(senderID);
    userName = userInfo[senderID]?.name?.split(' ')[0] || "kaibigan";
  } catch (e) {}

  // Detect emotional tone from question
  let systemPrompt = "You are a BibleGPT that provides Bible verses and compassionate responses. ";
  
  const sadKeywords = ["nagkasala", "kasalanan", "sad", "malungkot", "guilty", "error", "mistake", "failure", "mali", "pagsisisi", "sorry", "patawad", "lonely", "alone", "anxious"];
  const lowerQuestion = userQuestion.toLowerCase();
  const isSad = sadKeywords.some(keyword => lowerQuestion.includes(keyword));
  
  if (isSad) {
    systemPrompt += "The user is feeling sad, guilty, or anxious. Be gentle, compassionate, and offer hope. Provide comforting Bible verses. DO NOT use cheerful greetings. Be empathetic and understanding.";
  } else {
    systemPrompt += "Be warm, helpful, and provide relevant Bible verses. Use Taglish naturally (mix of Tagalog and English).";
  }

  try {
    // Add conversation history for context
    const recentHistory = global.aiv2Users[senderID].history.slice(-3);
    let fullQuestion = userQuestion;
    
    if (recentHistory.length > 0) {
      let context = "Previous conversation:\n";
      for (const entry of recentHistory) {
        context += `User: ${entry.question}\n`;
        context += `Assistant: ${entry.answer}\n`;
      }
      fullQuestion = `${context}\n\nUser (${userName}): ${userQuestion}`;
    }

    // Call the Aqua API
    const apiUrl = `https://aqua-api-ihru.onrender.com/ai/venice?question=${encodeURIComponent(fullQuestion)}&systemPrompt=${encodeURIComponent(systemPrompt)}`;
    
    const response = await axios.get(apiUrl, { timeout: 30000 });
    
    let answer = response.data?.answer || response.data?.response || "I'm sorry, I couldn't generate a response. Please try again.";

    // Clean up the answer
    answer = answer.replace(/```/g, '').trim();

    // Ensure proper paragraph formatting
    const sentenceCount = (answer.match(/[.!?]+/g) || []).length;
    
    // If answer is long (more than 3 sentences) and doesn't have paragraph breaks, try to split it
    if (sentenceCount > 3 && !answer.includes('\n\n')) {
      const sentences = answer.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 1) {
        const splitPoint = Math.ceil(sentences.length / 2);
        const firstPara = sentences.slice(0, splitPoint).join(' ').trim();
        const secondPara = sentences.slice(splitPoint).join(' ').trim();
        if (secondPara.length > 0) {
          answer = `${firstPara}\n\n${secondPara}`;
        }
      }
    }

    // Store conversation in memory
    global.aiv2Users[senderID].history.push({
      question: userQuestion,
      answer: answer,
      timestamp: Date.now()
    });

    // Limit history to last 20 exchanges
    if (global.aiv2Users[senderID].history.length > 20) {
      global.aiv2Users[senderID].history.shift();
    }

    // Send the answer
    return api.sendMessage(answer, threadID, messageID);

  } catch (err) {
    console.error("AIv2 Error:", err);
    
    let errorMsg = "❌ Sorry, I couldn't generate a response. Please try again.";
    
    if (err.code === 'ECONNABORTED') {
      errorMsg = "❌ Request timed out. Please try again.";
    } else if (err.response?.status === 500) {
      errorMsg = "❌ Server error. Please try again later.";
    }
    
    return api.sendMessage(errorMsg, threadID, messageID);
  }
};
