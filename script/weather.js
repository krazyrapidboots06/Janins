const axios = require('axios');

module.exports.config = {
  name: "weather",
  version: "3.0.0",
  role: 0,
  credits: "selov",
  description: "Get accurate weather for any city worldwide",
  commandCategory: "utility",
  usages: "/weather <city>",
  cooldowns: 5,
  aliases: ["kainiton", "temp"]
};

// Get weather description from WMO code
function getWeatherDescription(code) {
  const weatherMap = {
    0: { desc: "Clear sky", emoji: "☀️" },
    1: { desc: "Mainly clear", emoji: "🌤️" },
    2: { desc: "Partly cloudy", emoji: "⛅" },
    3: { desc: "Overcast", emoji: "☁️" },
    45: { desc: "Foggy", emoji: "🌫️" },
    48: { desc: "Foggy", emoji: "🌫️" },
    51: { desc: "Light drizzle", emoji: "🌧️" },
    53: { desc: "Moderate drizzle", emoji: "🌧️" },
    55: { desc: "Heavy drizzle", emoji: "🌧️" },
    61: { desc: "Light rain", emoji: "🌦️" },
    63: { desc: "Moderate rain", emoji: "🌧️" },
    65: { desc: "Heavy rain", emoji: "🌧️" },
    71: { desc: "Light snow", emoji: "❄️" },
    73: { desc: "Moderate snow", emoji: "❄️" },
    75: { desc: "Heavy snow", emoji: "❄️" },
    80: { desc: "Rain showers", emoji: "🌦️" },
    81: { desc: "Rain showers", emoji: "🌦️" },
    82: { desc: "Violent rain", emoji: "⛈️" },
    95: { desc: "Thunderstorm", emoji: "⛈️" },
    96: { desc: "Thunderstorm", emoji: "⛈️" },
    99: { desc: "Thunderstorm", emoji: "⛈️" }
  };
  return weatherMap[code] || { desc: "Unknown", emoji: "🌍" };
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  let city = args.join(" ").trim();

  if (!city) {
    return api.sendMessage(
      `🌤️ WEATHER COMMAND\n━━━━━━━━━━━━━━━━\n` +
      `Usage: /weather <city>\n\n` +
      `Examples:\n` +
      `• /weather Lapu Lapu\n` +
      `• /weather Cebu City\n` +
      `• /weather Bohol\n` +
      `• /weather Manila\n` +
      `• /weather Tokyo\n` +
      `• /weather New York\n\n` +
      `🌏 Works for ANY city worldwide!`,
      threadID,
      messageID
    );
  }

  const waitingMsg = await api.sendMessage(`🔍 Getting weather for ${city}...`, threadID);

  try {
    // Step 1: Get coordinates using Open-Meteo Geocoding API
    const geoRes = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en`,
      { timeout: 10000 }
    );
    
    if (!geoRes.data.results || geoRes.data.results.length === 0) {
      return api.editMessage(`❌ City "${city}" not found. Please check the spelling.`, waitingMsg.messageID);
    }
    
    // Take the first result (best match)
    const location = geoRes.data.results[0];
    const lat = location.latitude;
    const lon = location.longitude;
    const locationName = location.name;
    const country = location.country || "";
    const admin1 = location.admin1 || ""; // State/Province
    
    // Step 2: Get current weather
    const weatherRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto&daily=temperature_2m_max,temperature_2m_min&timeformat=unixtime`,
      { timeout: 10000 }
    );
    
    const current = weatherRes.data.current_weather;
    const daily = weatherRes.data.daily;
    
    // Current temperature
    const temp = Math.round(current.temperature);
    const windspeed = Math.round(current.windspeed);
    const weatherCode = current.weathercode;
    const windDirection = current.winddirection || 0;
    
    // Get weather description
    const weather = getWeatherDescription(weatherCode);
    
    // Get today's high and low
    const todayHigh = Math.round(daily.temperature_2m_max[0]);
    const todayLow = Math.round(daily.temperature_2m_min[0]);
    
    // Get current time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' });
    const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
    
    // Determine time of day greeting
    const hour = now.getHours();
    let greeting = "";
    if (hour < 12) greeting = "🌅 Good Morning!";
    else if (hour < 18) greeting = "☀️ Good Afternoon!";
    else greeting = "🌙 Good Evening!";
    
    // Determine heat advisory
    let heatAdvisory = "";
    if (temp >= 40) heatAdvisory = "\n⚠️ EXTREME HEAT WARNING! Stay hydrated! 💧";
    else if (temp >= 36) heatAdvisory = "\n🔥 Heat Advisory! Drink plenty of water.";
    else if (temp >= 32) heatAdvisory = "\n🌞 Warm day! Stay cool.";
    
    // Wind direction to arrow
    const windArrows = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
    const windIndex = Math.round(windDirection / 45) % 8;
    const windArrow = windArrows[windIndex];
    
    // Build location display
    let locationDisplay = locationName;
    if (admin1 && admin1 !== locationName) locationDisplay += `, ${admin1}`;
    if (country) locationDisplay += `, ${country}`;
    
    const resultMsg = 
      `${weather.emoji} WEATHER IN ${locationDisplay.toUpperCase()}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 ${dateStr}\n` +
      `🕐 ${timeStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌡️ Current: ${temp}°C\n` +
      `📈 High: ${todayHigh}°C | 📉 Low: ${todayLow}°C\n` +
      `💨 Wind: ${windspeed} km/h ${windArrow}\n` +
      `📝 Condition: ${weather.desc}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${greeting}${heatAdvisory}`;
    
    await api.editMessage(resultMsg, waitingMsg.messageID);
    
  } catch (err) {
    console.error("Weather Error:", err);
    await api.editMessage(`❌ Failed to get weather for "${city}". Please check the city name and try again.`, waitingMsg.messageID);
  }
};
