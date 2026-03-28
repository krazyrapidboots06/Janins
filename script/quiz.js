const axios = require("axios");

module.exports.config = {
  name: "quiz",
  version: "3.1.0",
  hasPermssion: 0,
  credits: "fixed by ChatGPT",
  description: "AI quiz with working reply",
  commandCategory: "fun",
  usages: "quiz [topic]",
  cooldowns: 5
};

// AI request
async function askAI(prompt) {
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
  const res = await axios.get(url);
  return res.data;
}

// Generate question
async function generateQuestion(topic) {
  const prompt =
    `Make a quiz about ${topic}.\n\n` +
    `Format:\n` +
    `QUESTION: ...\nA: ...\nB: ...\nC: ...\nD: ...\nANSWER: A/B/C/D\nEXPLANATION: ...`;

  const raw = await askAI(prompt);

  return {
    question: raw.match(/QUESTION:\s*(.*)/i)?.[1],
    A: raw.match(/A:\s*(.*)/i)?.[1],
    B: raw.match(/B:\s*(.*)/i)?.[1],
    C: raw.match(/C:\s*(.*)/i)?.[1],
    D: raw.match(/D:\s*(.*)/i)?.[1],
    answer: raw.match(/ANSWER:\s*([ABCD])/i)?.[1]?.toUpperCase(),
    explanation: raw.match(/EXPLANATION:\s*(.*)/i)?.[1] || "No explanation"
  };
}

// RUN
module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID } = event;

  const topic = args.join(" ") || "general knowledge";

  const q = await generateQuestion(topic);

  if (!q.question || !q.answer) {
    return api.sendMessage("❌ Failed to generate quiz.", threadID);
  }

  const msg =
    `🧠 QUIZ — ${topic.toUpperCase()}\n` +
    `━━━━━━━━━━━━━━\n` +
    `❓ ${q.question}\n\n` +
    `A️⃣ ${q.A}\n` +
    `B️⃣ ${q.B}\n` +
    `C️⃣ ${q.C}\n` +
    `D️⃣ ${q.D}\n\n` +
    `👉 Reply with A, B, C, or D`;

  api.sendMessage(msg, threadID, (err, info) => {
    if (err) return;

    // ✅ VERY IMPORTANT FIX
    global.client.handleReply.push({
      name: module.exports.config.name,
      messageID: info.messageID,
      author: senderID,
      answer: q.answer,
      explanation: q.explanation,
      type: "quiz" // ⚠️ REQUIRED in some Mirai bases
    });
  });
};

// HANDLE REPLY
module.exports.handleReply = async function ({ api, event, handleReply }) {
  try {
    const { threadID, messageID, senderID, body } = event;

    // 🔥 DEBUG (you can remove later)
    console.log("REPLY DETECTED:", body);

    if (senderID !== handleReply.author) return;

    if (!body) return;

    const ans = body.trim().toUpperCase();

    if (!["A", "B", "C", "D"].includes(ans)) {
      return api.sendMessage(
        "❌ Reply only A, B, C, or D.",
        threadID,
        messageID
      );
    }

    const correct = handleReply.answer;

    const msg =
      ans === correct
        ? `✅ CORRECT!\n\n💡 ${handleReply.explanation}`
        : `❌ WRONG!\nCorrect: ${correct}\n\n💡 ${handleReply.explanation}`;

    return api.sendMessage(msg, threadID, messageID);

  } catch (e) {
    console.error("HANDLE REPLY ERROR:", e);
  }
};
