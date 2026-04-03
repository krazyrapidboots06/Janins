const {
  createCanvas,
  loadImage,
  registerFont
} = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// Font registration
const fontDir = path.join(__dirname, 'assets', 'font');
const canvasFontDir = path.join(__dirname, 'canvas', 'fonts');

// Register fonts if they exist (skip if not found)
try {
  registerFont(path.join(fontDir, "NotoSans-Bold.ttf"), { family: 'NotoSans', weight: 'bold' });
  registerFont(path.join(fontDir, "NotoSans-SemiBold.ttf"), { family: 'NotoSans', weight: '600' });
  registerFont(path.join(fontDir, "NotoSans-Regular.ttf"), { family: 'NotoSans', weight: 'normal' });
  registerFont(path.join(fontDir, "BeVietnamPro-Bold.ttf"), { family: 'BeVietnamPro', weight: 'bold' });
  registerFont(path.join(fontDir, "BeVietnamPro-SemiBold.ttf"), { family: 'BeVietnamPro', weight: '600' });
  registerFont(path.join(fontDir, "BeVietnamPro-Regular.ttf"), { family: 'BeVietnamPro', weight: 'normal' });
  registerFont(path.join(fontDir, "Kanit-SemiBoldItalic.ttf"), { family: 'Kanit', weight: '600', style: 'italic' });
  registerFont(path.join(canvasFontDir, "Rounded.otf"), { family: 'Rounded' });
} catch (e) {
  console.log("Font registration warning:", e.message);
}

module.exports.config = {
  name: "welcome",
  version: "2.0.0",
  role: 0,
  credits: "Neoaz ゐ",
  description: "Sends welcome image when new members join",
  commandCategory: "events",
  cooldowns: 0,
  eventType: ["log:subscribe"]
};

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

// Helper: Draw circular image
async function drawCircularImage(ctx, loadImage, imageSrc, x, y, radius, borderColor, borderWidth = 5) {
  try {
    const image = await loadImage(imageSrc);
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, radius + borderWidth, 0, Math.PI * 2);
    ctx.fillStyle = borderColor;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, radius + borderWidth, 0, Math.PI * 2);
    ctx.fillStyle = borderColor;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  } catch (err) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1f1f1f';
    ctx.fill();
  }
}

// Create welcome canvas
async function createWelcomeCanvas(gcImg, img1, img2, userName, userNumber, threadName, adderName) {
  const width = 1200;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  // Diagonal lines
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

  // Decorative squares
  const squares = [
    { x: 50, y: 50, size: 80, rotation: 15 },
    { x: 1100, y: 80, size: 60, rotation: -20 },
    { x: 150, y: 500, size: 50, rotation: 30 },
    { x: 1050, y: 480, size: 70, rotation: -15 },
    { x: 900, y: 30, size: 40, rotation: 45 },
    { x: 200, y: 150, size: 35, rotation: -30 },
    { x: 400, y: 80, size: 45, rotation: 60 },
    { x: 700, y: 520, size: 55, rotation: -40 },
    { x: 950, y: 250, size: 38, rotation: 25 },
    { x: 300, y: 350, size: 42, rotation: -50 }
  ];

  squares.forEach(sq => {
    ctx.save();
    ctx.translate(sq.x + sq.size / 2, sq.y + sq.size / 2);
    ctx.rotate((sq.rotation * Math.PI) / 180);
    const sqGradient = ctx.createLinearGradient(-sq.size / 2, -sq.size / 2, sq.size / 2, sq.size / 2);
    sqGradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    sqGradient.addColorStop(1, 'rgba(22, 163, 74, 0.1)');
    ctx.fillStyle = sqGradient;
    ctx.fillRect(-sq.size / 2, -sq.size / 2, sq.size, sq.size);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-sq.size / 2, -sq.size / 2, sq.size, sq.size);
    ctx.restore();
  });

  // Decorative circles
  const circles = [
    { x: 250, y: 250, radius: 30, alpha: 0.15 },
    { x: 850, y: 150, radius: 25, alpha: 0.12 },
    { x: 600, y: 50, radius: 20, alpha: 0.1 },
    { x: 100, y: 350, radius: 35, alpha: 0.18 },
    { x: 1000, y: 380, radius: 28, alpha: 0.14 },
    { x: 450, y: 480, radius: 22, alpha: 0.11 }
  ];

  circles.forEach(circ => {
    ctx.beginPath();
    ctx.arc(circ.x, circ.y, circ.radius, 0, Math.PI * 2);
    const circGradient = ctx.createRadialGradient(circ.x, circ.y, 0, circ.x, circ.y, circ.radius);
    circGradient.addColorStop(0, `rgba(34, 197, 94, ${circ.alpha})`);
    circGradient.addColorStop(1, 'rgba(22, 163, 74, 0)');
    ctx.fillStyle = circGradient;
    ctx.fill();
    ctx.strokeStyle = `rgba(34, 197, 94, ${circ.alpha * 2})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Decorative triangles
  const triangles = [
    { x: 550, y: 150, size: 40, rotation: 0 },
    { x: 180, y: 420, size: 35, rotation: 180 },
    { x: 1080, y: 320, size: 38, rotation: 90 },
    { x: 380, y: 200, size: 32, rotation: -45 }
  ];

  triangles.forEach(tri => {
    ctx.save();
    ctx.translate(tri.x, tri.y);
    ctx.rotate((tri.rotation * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -tri.size / 2);
    ctx.lineTo(-tri.size / 2, tri.size / 2);
    ctx.lineTo(tri.size / 2, tri.size / 2);
    ctx.closePath();
    const triGradient = ctx.createLinearGradient(-tri.size / 2, 0, tri.size / 2, 0);
    triGradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
    triGradient.addColorStop(1, 'rgba(22, 163, 74, 0.1)');
    ctx.fillStyle = triGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });

  // Draw adder avatar (top right)
  await drawCircularImage(ctx, loadImage, img2, width - 120, 100, 55, '#22c55e');
  fitAndSetFont(ctx, '"NotoSans", "BeVietnamPro", sans-serif', 'bold', 22, 14, 'Added by ' + adderName, 320);
  ctx.fillStyle = '#22c55e';
  ctx.textAlign = 'right';
  drawTextWithStroke(ctx, 'Added by ' + adderName, width - 190, 105, 'right');

  // Draw user avatar (bottom left)
  await drawCircularImage(ctx, loadImage, img1, 120, height - 100, 55, '#16a34a');
  fitAndSetFont(ctx, '"NotoSans", "BeVietnamPro", sans-serif', 'bold', 28, 16, userName, width - 250);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  drawTextWithStroke(ctx, userName, 190, height - 95, 'left');

  // Draw group avatar (center top)
  await drawCircularImage(ctx, loadImage, gcImg, width / 2, 200, 90, '#22c55e', 6);
  
  // Draw group name
  fitAndSetFont(ctx, '"NotoSans", "BeVietnamPro", sans-serif', '600', 42, 20, threadName, width * 0.8);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawTextWithStroke(ctx, threadName, width / 2, 335, 'center');

  // Draw WELCOME text
  fitAndSetFont(ctx, '"Kanit", "NotoSans", sans-serif', '600', 56, 28, 'WELCOME', width * 0.9, 'italic');
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
  fitAndSetFont(ctx, '"NotoSans", "BeVietnamPro", sans-serif', '600', 26, 16, `You are the ${userNumber}th member`, width * 0.9);
  ctx.fillStyle = '#a0a0a0';
  ctx.textAlign = 'center';
  drawTextWithStroke(ctx, `You are the ${userNumber}th member`, width / 2, 480, 'center');

  return canvas.createPNGStream();
}

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, logMessageType, logMessageData } = event;
  
  // Check if this is a subscribe event
  if (logMessageType !== "log:subscribe") return;
  
  const addedParticipants = logMessageData.addedParticipants || [];
  
  for (const user of addedParticipants) {
    const addedUserId = user.userFbId;
    
    // Don't send welcome for bot itself
    if (addedUserId === api.getCurrentUserID()) continue;
    
    try {
      // Get thread info
      const threadInfo = await api.getThreadInfo(threadID);
      const groupName = threadInfo.threadName || "Group";
      const memberCount = threadInfo.participantIDs?.length || 1;
      const groupImage = threadInfo.imageSrc || "https://i.imgur.com/7Qk8k6c.png";
      
      // Get user info
      const userInfo = await api.getUserInfo(addedUserId);
      const userName = userInfo[addedUserId]?.name || user.fullName || "New Member";
      
      // Get adder info (who added the member)
      let adderName = "Someone";
      try {
        const adderInfo = await api.getUserInfo(event.author);
        adderName = adderInfo[event.author]?.name || "Someone";
      } catch (e) {}
      
      // Get profile picture URLs
      const userAvatar = `https://graph.facebook.com/${addedUserId}/picture?width=500&height=500`;
      const adderAvatar = `https://graph.facebook.com/${event.author}/picture?width=500&height=500`;
      
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
        `🌸 WELCOME! 🌸\n━━━━━━━━━━━━━━━━\n` +
        `🌷 Name: ${userName}\n` +
        `🏷️ Group: ${groupName}\n` +
        `🔢 Member #${memberCount}**\n` +
        `👤 Added by: ${adderName}\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `🎉 Enjoy your stay! 🎉`;
      
      await api.sendMessage({
        body: welcomeMessage,
        attachment: fs.createReadStream(imagePath)
      }, threadID);
      
      // Clean up image file
      setTimeout(() => {
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (e) {}
      }, 10000);
      
    } catch (err) {
      console.error("Welcome error:", err.message);
      
      // Fallback: Send text-only welcome
      try {
        const fallbackMsg = `🌸 Welcome ${user.fullName || "New Member"} to the group! 🌸\nEnjoy your stay!`;
        await api.sendMessage(fallbackMsg, threadID);
      } catch (e) {}
    }
  }
};
