const {
  createCanvas,
  loadImage,
  registerFont
} = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

module.exports.config = {
  name: "welcome",
  version: "3.0.0",
  role: 0,
  credits: "selov",
  description: "Sends welcome image when new members join",
  commandCategory: "events",
  cooldowns: 0,
  eventType: ["log:subscribe"]
};

// Font registration (try-catch to avoid errors if fonts missing)
try {
  const fontDir = path.join(__dirname, 'assets', 'font');
  registerFont(path.join(fontDir, "NotoSans-Bold.ttf"), { family: 'NotoSans', weight: 'bold' });
  registerFont(path.join(fontDir, "NotoSans-Regular.ttf"), { family: 'NotoSans', weight: 'normal' });
} catch (e) {}

// Helper: Get valid profile picture URL with fallback
async function getValidImageUrl(url, fallbackUrl = null) {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    if (response.status === 200) return url;
  } catch (e) {}
  return fallbackUrl || "https://i.imgur.com/7Qk8k6c.png";
}

// Helper: Load image with retry and fallback
async function loadImageSafe(imageUrl, fallbackUrl = "https://i.imgur.com/7Qk8k6c.png") {
  try {
    const validUrl = await getValidImageUrl(imageUrl, fallbackUrl);
    return await loadImage(validUrl);
  } catch (err) {
    console.error("Image load error:", err.message);
    return await loadImage(fallbackUrl);
  }
}

// Helper: Draw circular image
async function drawCircularImage(ctx, imageUrl, x, y, radius, borderColor, borderWidth = 5, fallbackUrl = "https://i.imgur.com/7Qk8k6c.png") {
  try {
    const img = await loadImageSafe(imageUrl, fallbackUrl);
    
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, radius + borderWidth, 0, Math.PI * 2);
    ctx.fillStyle = borderColor;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  } catch (err) {
    console.error("Draw circular image error:", err.message);
    // Draw a placeholder circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#374151';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${radius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x, y);
  }
}

// Helper: Fit and set font
function fitAndSetFont(ctx, family, weight, maxSize, minSize, text, maxWidth, style = '') {
  let size = maxSize;
  for (; size >= minSize; size -= 1) {
    ctx.font = `${style ? style + ' ' : ''}${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  ctx.font = `${style ? style + ' ' : ''}${weight} ${Math.max(size, minSize)}px ${family}`;
  return Math.max(size, minSize);
}

// Helper: Draw text with stroke
function drawTextWithStroke(ctx, text, x, y, align = 'left') {
  ctx.textAlign = align;
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 4;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

// Create welcome canvas
async function createWelcomeCanvas(gcImg, userImg, adderImg, userName, userNumber, threadName, adderName) {
  const width = 1200;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  // Diagonal lines decoration
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  for (let i = -height; i < width; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }

  // Light gradient overlay
  const lightGradient = ctx.createLinearGradient(0, 0, width, height);
  lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.fillStyle = lightGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw adder avatar (top right)
  await drawCircularImage(ctx, adderImg, width - 120, 100, 55, '#22c55e');
  
  // Draw "Added by" text
  fitAndSetFont(ctx, '"NotoSans", sans-serif', 'bold', 22, 14, 'Added by ' + adderName, 320);
  ctx.fillStyle = '#22c55e';
  ctx.textAlign = 'right';
  drawTextWithStroke(ctx, 'Added by ' + adderName, width - 190, 105, 'right');

  // Draw user avatar (bottom left)
  await drawCircularImage(ctx, userImg, 120, height - 100, 55, '#16a34a');
  
  // Draw user name
  fitAndSetFont(ctx, '"NotoSans", sans-serif', 'bold', 28, 16, userName, width - 250);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  drawTextWithStroke(ctx, userName, 190, height - 95, 'left');

  // Draw group avatar (center top)
  await drawCircularImage(ctx, gcImg, width / 2, 200, 90, '#22c55e', 6);
  
  // Draw group name
  fitAndSetFont(ctx, '"NotoSans", sans-serif', '600', 42, 20, threadName, width * 0.8);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawTextWithStroke(ctx, threadName, width / 2, 335, 'center');

  // Draw WELCOME text
  fitAndSetFont(ctx, '"NotoSans", sans-serif', '600', 56, 28, 'WELCOME', width * 0.9);
  const nameGradient = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
  nameGradient.addColorStop(0, '#4ade80');
  nameGradient.addColorStop(1, '#22c55e');
  ctx.fillStyle = nameGradient;
  drawTextWithStroke(ctx, 'WELCOME', width / 2, 410, 'center');

  // Underline
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 180, 430);
  ctx.lineTo(width / 2 + 180, 430);
  ctx.stroke();

  // Member number text
  fitAndSetFont(ctx, '"NotoSans", sans-serif', '600', 26, 16, `You are the ${userNumber}th member`, width * 0.9);
  ctx.fillStyle = '#a0a0a0';
  ctx.textAlign = 'center';
  drawTextWithStroke(ctx, `You are the ${userNumber}th member`, width / 2, 480, 'center');

  return canvas.createPNGStream();
}

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, logMessageType, logMessageData } = event;
  
  if (logMessageType !== "log:subscribe") return;
  
  const addedParticipants = logMessageData.addedParticipants || [];
  
  for (const user of addedParticipants) {
    const addedUserId = user.userFbId;
    
    if (addedUserId === api.getCurrentUserID()) continue;
    
    try {
      // Get thread info
      const threadInfo = await api.getThreadInfo(threadID);
      const groupName = threadInfo.threadName || "Group";
      const memberCount = threadInfo.participantIDs?.length || 1;
      
      // Get group image (try to get from thread info)
      let groupImage = threadInfo.imageSrc;
      if (!groupImage || groupImage === "") {
        groupImage = "https://i.imgur.com/7Qk8k6c.png";
      }
      
      // Get user info
      const userInfo = await api.getUserInfo(addedUserId);
      const userName = userInfo[addedUserId]?.name || user.fullName || "New Member";
      
      // Get adder info
      let adderName = "Someone";
      let adderId = event.author;
      try {
        const adderInfo = await api.getUserInfo(adderId);
        adderName = adderInfo[adderId]?.name || "Someone";
      } catch (e) {}
      
      // Get profile picture URLs with proper access token
      // Using Facebook Graph API with access token for better reliability
      const accessToken = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662"; // Public token for avatars
      
      const userAvatar = `https://graph.facebook.com/${addedUserId}/picture?width=500&height=500&access_token=${accessToken}`;
      const adderAvatar = `https://graph.facebook.com/${adderId}/picture?width=500&height=500&access_token=${accessToken}`;
      
      // Create cache directory
      const cacheDir = path.join(__dirname, 'cache', 'welcome');
      await fs.ensureDir(cacheDir);
      
      // Generate welcome image
      const imageStream = await createWelcomeCanvas(
        groupImage,
        userAvatar,
        adderAvatar,
        userName,
        memberCount,
        groupName,
        adderName
      );
      
      const imagePath = path.join(cacheDir, `welcome_${addedUserId}_${Date.now()}.png`);
      const writeStream = fs.createWriteStream(imagePath);
      imageStream.pipe(writeStream);
      
      await new Promise((resolve) => {
        writeStream.on('finish', resolve);
      });
      
      // Send welcome message
      const welcomeMessage = 
        `🎉 WELCOME! 🎉\n━━━━━━━━━━━━━━━━\n` +
        `👤 Name: ${userName}\n` +
        `🏷️ Group: ${groupName}\n` +
        `🔢 Member #${memberCount}**\n` +
        `👑 Added by: ${adderName}\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `🎊 Enjoy your stay! 🎊`;
      
      await api.sendMessage({
        body: welcomeMessage,
        attachment: fs.createReadStream(imagePath)
      }, threadID);
      
      // Clean up
      setTimeout(() => {
        try {
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (e) {}
      }, 10000);
      
    } catch (err) {
      console.error("Welcome error:", err.message);
      
      // Fallback: text only
      try {
        const fallbackMsg = `🎉 Welcome ${user.fullName || "New Member"} to the group! 🎉\nEnjoy your stay!`;
        await api.sendMessage(fallbackMsg, threadID);
      } catch (e) {}
    }
  }
};
