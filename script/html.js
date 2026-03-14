const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "html",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Generate and preview websites from text",
  commandCategory: "coding",
  usages: "html <describe what website you want>",
  cooldowns: 5
};

const memory = {};

// HTML to pastebin upload function
async function uploadToPastebin(htmlCode) {
  try {
    // Using pastebin.com API (you need to register for an API key)
    // For demo, we'll use a free alternative
    const response = await axios.post('https://api.paste.ee/v1/pastes', {
      description: 'Generated Website',
      sections: [{
        name: 'index.html',
        contents: htmlCode
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': 'YOUR_PASTE_TOKEN' // Get from paste.ee
      }
    });
    
    return response.data.link;
  } catch (e) {
    return null;
  }
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const description = args.join(" ").trim();

  try {
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    if (!description) {
      return api.sendMessage(
        "🌐 **Website Generator**\n━━━━━━━━━━━━━━━━\nDescribe what website you want:\n\n" +
        "**Examples:**\n" +
        "• /html create a blue login form\n" +
        "• /html make a calculator with buttons\n" +
        "• /html design a modern portfolio\n" +
        "• /html create a weather app interface\n" +
        "• /html make a todo list with dark theme",
        threadID,
        messageID
      );
    }

    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} requested: ${description}`);

    const waiting = await api.sendMessage("🎨 **Generating website...**\n━━━━━━━━━━━━━━━━\n" + 
      "1. Analyzing description...\n" +
      "2. Writing HTML structure...\n" +
      "3. Styling with CSS...\n" +
      "4. Adding JavaScript...\n" +
      "5. Packaging website...", threadID, messageID);

    // Enhanced AI prompt for better website generation
    const aiPrompt = `Create a complete, self-contained HTML website based on this description: "${description}"

    REQUIREMENTS:
    - Return ONLY the HTML code with NO explanations
    - Include ALL CSS in <style> tags
    - Include ALL JavaScript in <script> tags
    - Make it fully responsive (mobile and desktop)
    - Use modern, attractive design
    - Add hover effects and transitions
    - Ensure it's functional and interactive
    - Include appropriate meta tags for responsiveness
    - Use semantic HTML5 elements
    - Make it visually appealing with good color scheme
    
    The website should be complete and ready to run when opened in a browser.`;

    const aiUrl = `https://deku-rest-api-spring.onrender.com/chatgpt?prompt=${encodeURIComponent(aiPrompt)}`;
    const aiResponse = await axios.get(aiUrl);

    let htmlCode = "";
    
    if (aiResponse.data?.response) htmlCode = aiResponse.data.response;
    else if (aiResponse.data?.message) htmlCode = aiResponse.data.message;
    else if (typeof aiResponse.data === 'string') htmlCode = aiResponse.data;

    // Clean up the code
    htmlCode = htmlCode.replace(/```html/g, '').replace(/```/g, '').trim();

    if (!htmlCode || htmlCode.length < 100) {
      return api.editMessage("❌ Failed to generate website. Try a different description.", waiting.messageID);
    }

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "websites");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Save HTML file
    const fileName = `website_${Date.now()}.html`;
    const filePath = path.join(cacheDir, fileName);
    fs.writeFileSync(filePath, htmlCode);

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    // Try to upload to pastebin for live preview
    const pasteLink = await uploadToPastebin(htmlCode);

    // Count lines of code
    const linesOfCode = htmlCode.split('\n').length;

    // Create preview of the code
    const codePreview = htmlCode
      .split('\n')
      .slice(0, 15)
      .map(line => line.substring(0, 80))
      .join('\n');

    // Delete waiting message
    api.unsendMessage(waiting.messageID);

    // Send response with file and preview
    const responseMessage = 
      `🌐 **WEBSITE GENERATED SUCCESSFULLY**\n━━━━━━━━━━━━━━━━\n` +
      `**Description:** ${description}\n` +
      `**File:** ${fileName}\n` +
      `**Size:** ${fileSizeKB} KB\n` +
      `**Lines of Code:** ${linesOfCode}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `**📱 Preview (first 15 lines):**\n` +
      `\`\`\`html\n${codePreview}${htmlCode.split('\n').length > 15 ? '\n...' : ''}\n\`\`\`\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `**💡 How to use:**\n` +
      `1. Download the attached HTML file\n` +
      `2. Open it in any web browser\n` +
      `3. View your generated website!\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `✨ Generated by AI for ${senderName}`;

    api.sendMessage(
      {
        body: responseMessage,
        attachment: fs.createReadStream(filePath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending file:", err);
        // Delete file after 10 minutes
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (e) {}
        }, 600000);
      },
      messageID
    );

    // Store in memory
    memory[threadID].push(`Generated website: ${description.substring(0, 50)}...`);

  } catch (err) {
    console.error("HTML Generator Error:", err);
    api.sendMessage(`❌ **Error:** ${err.message}`, threadID, messageID);
  }
};
