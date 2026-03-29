const axios = require('axios');

module.exports.config = {
  name: "gpt",
  version: "3.0.0",
  role: 0,
  credits: "selov",
  description: "AI-powered Bible study assistant with paragraph-formatted responses",
  commandCategory: "religion",
  usages: "/biblegpt <question>",
  cooldowns: 3,
  aliases: ["bibleai", "bibleask"]
};

// Store user conversation history
if (!global.bibleAIUsers) global.bibleAIUsers = {};

// Bible context for the AI
const BIBLE_CONTEXT = `You are BibleGPT, an AI assistant focused on answering questions about the Bible, theology, and Christian living. 
Base your answers on Scripture. Keep responses helpful, accurate, and respectful.

IMPORTANT FORMATTING RULE:
- If your answer is LONG (more than 3 sentences), format it as TWO PARAGRAPHS with a blank line between them.
- If your answer is SHORT (3 sentences or less), format it as ONE PARAGRAPH only.
- Make your responses warm, conversational, and engaging.
- Use Taglish (Tagalog + English) naturally.`;

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const userQuestion = args.join(" ").trim();

  if (!userQuestion) {
    return api.sendMessage(
      `📖 BibleGPT\n━━━━━━━━━━━━━━━━\n` +
      `Ask me anything about the Bible!\n\n` +
      `Examples:\n` +
      `• /biblegpt What does the Bible say about love?\n` +
      `• /biblegpt Explain John 3:16\n` +
      `• /biblegpt How can I grow in faith?\n` +
      `• /biblegpt Ano ang sinasabi ng Biblia tungkol sa pag-asa?`,
      threadID,
      messageID
    );
  }

  // Initialize user memory if not exists
  if (!global.bibleAIUsers[senderID]) {
    global.bibleAIUsers[senderID] = {
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

  try {
    // Add conversation history for context
    const recentHistory = global.bibleAIUsers[senderID].history.slice(-3);
    
    let fullPrompt = `${BIBLE_CONTEXT}\n\n`;
    
    // Add conversation history if exists
    if (recentHistory.length > 0) {
      fullPrompt += `Previous conversation:\n`;
      for (const entry of recentHistory) {
        fullPrompt += `User: ${entry.question}\n`;
        fullPrompt += `Assistant: ${entry.answer}\n\n`;
      }
    }
    
    // Add current question with user's name
    fullPrompt += `User: ${userName} asked: ${userQuestion}\n\n`;
    fullPrompt += `Assistant: Provide a helpful, Bible-based response. Remember: 
- If answer is LONG (more than 3 sentences) → use TWO PARAGRAPHS with a blank line between
- If answer is SHORT (3 sentences or less) → use ONE PARAGRAPH only
- Use Taglish (Tagalog + English) naturally
- Be warm and conversational like: "Ang saya naman marinig 'yan, ${userName}! ..."`;

    // Call the Vern REST API
    const response = await axios.get(
      `https://vern-rest-api.vercel.app/api/chatgpt4?prompt=${encodeURIComponent(fullPrompt)}`,
      { timeout: 30000 }
    );

    let answer = response.data?.result || 
                 response.data?.response || 
                 response.data?.message || 
                 response.data?.answer ||
                 "I'm sorry, I couldn't generate a response. Please try again.";

    // Clean up the answer
    answer = answer.replace(/```/g, '').trim();

    // Ensure proper paragraph formatting
    // If the answer doesn't have double newlines and is long, try to split it
    if (!answer.includes('\n\n') && answer.split('.').length > 4) {
      // Find a good place to split (after a sentence ending with period)
      const sentences = answer.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 2) {
        const midPoint = Math.floor(sentences.length / 2);
        const firstPara = sentences.slice(0, midPoint).join(' ');
        const secondPara = sentences.slice(midPoint).join(' ');
        answer = `${firstPara}\n\n${secondPara}`;
      }
    }

    // Store conversation in memory
    global.bibleAIUsers[senderID].history.push({
      question: userQuestion,
      answer: answer,
      timestamp: Date.now()
    });

    // Limit history to last 20 exchanges
    if (global.bibleAIUsers[senderID].history.length > 20) {
      global.bibleAIUsers[senderID].history.shift();
    }

    // Send the answer
    return api.sendMessage(answer, threadID, messageID);

  } catch (err) {
    console.error("BibleGPT Error:", err);
    
    let errorMsg = "❌ Sorry, I couldn't generate a response. Please try again.";
    
    if (err.response?.status === 400) {
      errorMsg = "❌ Invalid request. Please try a different question.";
    } else if (err.code === 'ECONNABORTED') {
      errorMsg = "❌ Request timed out. Please try again.";
    }
    
    return api.sendMessage(errorMsg, threadID, messageID);
  }
};
