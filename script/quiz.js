const axios = require("axios");

module.exports.config = {
  name: "quiz",
  version: "4.0.0",
  hasPermssion: 0,
  credits: "fixed fully",
  description: "quiz working without handleReply",
  commandCategory: "fun",
  usages: "quiz [topic]",
  cooldowns: 5
};

// store quiz
if (!global.quizData) global.quizData = {};

// AI
async function askAI(prompt) {
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
  const res = await axios.get(url);
  return res.data;
}

// generate
async function generateQuestion(topic) {
  const raw = await askAI(
    `Make quiz about ${topic}\nFormat:\nQUESTION:\nA:\nB:\nC:\nD:\nANSWER:\nEXPLANATION:`
  );

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

  global.quizData[threadID] = {
    answer: q.answer,
    explanation: q.explanation,
    author: senderID
  };

  return api.sendMessage(
    `🧠 QUIZ — ${topic.toUpperCase()}\n━━━━━━━━━━━━━━\n❓ ${q.question}\n\nA️⃣ ${q.A}\nB️⃣ ${q.B}\nC️⃣ ${q.C}\nD️⃣ ${q.D}\n\n👉 Reply A, B, C, or D`,
    threadID
  );
};

// HANDLE EVENT (🔥 THIS FIXES EVERYTHING)
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!body) return;

  const session = global.quizData[threadID];
  if (!session) return;

  if (senderID !== session.author) return;

  const ans = body.trim().toUpperCase();

  if (!["A", "B", "C", "D"].includes(ans)) return;

  delete global.quizData[threadID];

  const msg =
    ans === session.answer
      ? `✅ CORRECT!\n\n💡 ${session.explanation}`
      : `❌ WRONG!\nCorrect: ${session.answer}\n\n💡 ${session.explanation}`;

  return api.sendMessage(msg, threadID);
};
