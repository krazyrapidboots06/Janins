"use strict";

/**
 * Anti-Detection Utilities for Facebook Bot
 * Helps avoid account bans by making bot behavior more human-like
 */

/**
 * Generate realistic random delays
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise} Resolves after delay
 */
function randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simulate typing for a realistic duration based on message length
 * @param {string} message - The message to be sent
 * @returns {number} Delay in milliseconds
 */
function calculateTypingTime(message) {
    // Average human typing speed: 40-60 words per minute (200-300 chars/min)
    // We'll use 250 chars/min = ~240ms per character
    const baseTime = message.length * 240;
    
    // Add randomness (±30%)
    const variance = baseTime * 0.3;
    const typingTime = baseTime + (Math.random() * variance * 2 - variance);
    
    // Min 800ms, max 10 seconds
    return Math.max(800, Math.min(10000, typingTime));
}

/**
 * Simulate human reading time before responding
 * @param {string} receivedMessage - The message received
 * @returns {number} Delay in milliseconds
 */
function calculateReadingTime(receivedMessage) {
    // Average reading speed: 200-250 words per minute (~1000 chars/min)
    // We'll use 1200 chars/min = ~50ms per character
    const baseTime = receivedMessage.length * 50;
    
    // Add randomness (±40%)
    const variance = baseTime * 0.4;
    const readingTime = baseTime + (Math.random() * variance * 2 - variance);
    
    // Min 500ms, max 5 seconds
    return Math.max(500, Math.min(5000, readingTime));
}

/**
 * Rate limiter to prevent spam detection
 */
class RateLimiter {
    constructor() {
        this.messageCount = 0;
        this.startTime = Date.now();
        this.maxMessagesPerMinute = 10; // Conservative limit
        this.maxMessagesPerHour = 100;
        this.hourlyMessages = [];
    }
    
    /**
     * Check if we can send a message without triggering spam detection
     * @returns {boolean}
     */
    canSendMessage() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const oneHourAgo = now - 3600000;
        
        // Clean up old messages from hourly tracker
        this.hourlyMessages = this.hourlyMessages.filter(time => time > oneHourAgo);
        
        // Check per-minute limit
        const recentMessages = this.hourlyMessages.filter(time => time > oneMinuteAgo);
        if (recentMessages.length >= this.maxMessagesPerMinute) {
            console.log("⚠️  Rate limit: Too many messages in the last minute");
            return false;
        }
        
        // Check hourly limit
        if (this.hourlyMessages.length >= this.maxMessagesPerHour) {
            console.log("⚠️  Rate limit: Too many messages in the last hour");
            return false;
        }
        
        return true;
    }
    
    /**
     * Record a message being sent
     */
    recordMessage() {
        this.hourlyMessages.push(Date.now());
    }
    
    /**
     * Get suggested delay before next message
     * @returns {number} Delay in ms
     */
    getSuggestedDelay() {
        const recentCount = this.hourlyMessages.filter(
            time => time > Date.now() - 60000
        ).length;
        
        if (recentCount > 7) return 8000;  // Heavy usage: wait 8s
        if (recentCount > 5) return 5000;  // Moderate: wait 5s
        if (recentCount > 3) return 3000;  // Light: wait 3s
        return 1500; // Normal: wait 1.5s
    }
}

/**
 * User agent rotation for less predictable behavior
 */
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"
];

/**
 * Get a random user agent
 * @returns {string}
 */
function getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Behavior tracker to detect and prevent spam patterns
 */
class BehaviorTracker {
    constructor() {
        this.lastMessages = new Map(); // threadID -> last message
        this.messageFrequency = new Map(); // threadID -> timestamps[]
    }
    
    /**
     * Check if message looks like spam
     * @param {string} threadID
     * @param {string} message
     * @returns {boolean}
     */
    looksLikeSpam(threadID, message) {
        // Check for repeated identical messages
        const lastMsg = this.lastMessages.get(threadID);
        if (lastMsg === message) {
            console.log("⚠️  Spam detection: Duplicate message");
            return true;
        }
        
        // Check message frequency to same thread
        const timestamps = this.messageFrequency.get(threadID) || [];
        const recentTimestamps = timestamps.filter(t => t > Date.now() - 10000);
        
        if (recentTimestamps.length > 5) {
            console.log("⚠️  Spam detection: Too many messages to same thread");
            return true;
        }
        
        return false;
    }
    
    /**
     * Record a message being sent
     * @param {string} threadID
     * @param {string} message
     */
    recordMessage(threadID, message) {
        this.lastMessages.set(threadID, message);
        
        const timestamps = this.messageFrequency.get(threadID) || [];
        timestamps.push(Date.now());
        
        // Keep only last 10 timestamps
        if (timestamps.length > 10) {
            timestamps.shift();
        }
        
        this.messageFrequency.set(threadID, timestamps);
    }
    
    /**
     * Clean up old data
     */
    cleanup() {
        const oneHourAgo = Date.now() - 3600000;
        
        for (const [threadID, timestamps] of this.messageFrequency.entries()) {
            const recent = timestamps.filter(t => t > oneHourAgo);
            if (recent.length === 0) {
                this.messageFrequency.delete(threadID);
                this.lastMessages.delete(threadID);
            } else {
                this.messageFrequency.set(threadID, recent);
            }
        }
    }
}

/**
 * Activity scheduler to simulate human online/offline patterns
 */
class ActivityScheduler {
    constructor(_options = {}) {
        this.enabled = false;
    }
    
    isSleepTime() {
        return false;
    }
    
    getTimeMultiplier() {
        return 1.0;
    }
    
    shouldRespond() {
        return true;
    }
}

/**
 * Multi-message handler - waits if user sends multiple messages quickly
 */
class MultiMessageHandler {
    constructor() {
        this.pendingMessages = new Map(); // threadID -> message[]
        this.timers = new Map(); // threadID -> timeout
    }
    
    /**
     * Add message to pending queue
     * @param {string} threadID
     * @param {Object} message
     * @param {Function} callback - Called with all messages when ready
     */
    addMessage(threadID, message, callback) {
        // Get or create pending array
        const pending = this.pendingMessages.get(threadID) || [];
        pending.push(message);
        this.pendingMessages.set(threadID, pending);
        
        // Clear existing timer
        if (this.timers.has(threadID)) {
            clearTimeout(this.timers.get(threadID));
        }
        
        // Set new timer - if no new messages in 3 seconds, process all
        const timer = setTimeout(() => {
            const messages = this.pendingMessages.get(threadID) || [];
            this.pendingMessages.delete(threadID);
            this.timers.delete(threadID);
            
            if (messages.length > 1) {
                console.log(`📚 User sent ${messages.length} messages - reading all before responding`);
            }
            
            callback(messages);
        }, 3000); // Wait 3 seconds for more messages
        
        this.timers.set(threadID, timer);
    }
}

/**
 * Typo simulator - occasionally add realistic typos
 */
class TypoSimulator {
    constructor(frequency = 0.05) {
        this.frequency = frequency; // 5% chance of typo
        
        // Common typo patterns
        this.commonTypos = {
            'the': ['teh', 'hte'],
            'you': ['yuo', 'yu'],
            'and': ['adn', 'nad'],
            'are': ['aer', 'rae'],
            'that': ['taht', 'thta'],
            'have': ['ahve', 'hvae'],
            'with': ['wiht', 'wtih'],
            'this': ['tihs', 'thsi'],
            'from': ['form', 'frm'],
            'what': ['waht', 'wht']
        };
        
        // Adjacent keyboard keys for realistic typos
        this.adjacentKeys = {
            'a': ['s', 'q', 'w', 'z'],
            'b': ['v', 'g', 'h', 'n'],
            'c': ['x', 'd', 'f', 'v'],
            'd': ['s', 'e', 'r', 'f', 'c', 'x'],
            'e': ['w', 'r', 'd', 's'],
            'f': ['d', 'r', 't', 'g', 'v', 'c'],
            'g': ['f', 't', 'y', 'h', 'b', 'v'],
            'h': ['g', 'y', 'u', 'j', 'n', 'b'],
            'i': ['u', 'o', 'k', 'j'],
            'j': ['h', 'u', 'i', 'k', 'm', 'n'],
            'k': ['j', 'i', 'o', 'l', 'm'],
            'l': ['k', 'o', 'p'],
            'm': ['n', 'j', 'k'],
            'n': ['b', 'h', 'j', 'm'],
            'o': ['i', 'p', 'l', 'k'],
            'p': ['o', 'l'],
            'q': ['w', 'a'],
            'r': ['e', 't', 'f', 'd'],
            's': ['a', 'w', 'e', 'd', 'x', 'z'],
            't': ['r', 'y', 'g', 'f'],
            'u': ['y', 'i', 'j', 'h'],
            'v': ['c', 'f', 'g', 'b'],
            'w': ['q', 'e', 's', 'a'],
            'x': ['z', 's', 'd', 'c'],
            'y': ['t', 'u', 'h', 'g'],
            'z': ['a', 's', 'x']
        };
    }
    
    /**
     * Maybe add a typo to the message
     * @param {string} message
     * @returns {string}
     */
    addTypo(message) {
        // Only add typos occasionally
        if (Math.random() > this.frequency) {
            return message;
        }
        
        // Don't add typos to very short messages
        if (message.length < 10) {
            return message;
        }
        
        const words = message.split(' ');
        
        // Try common typo replacement first
        for (const word of Object.keys(this.commonTypos)) {
            const index = words.indexOf(word);
            if (index !== -1 && Math.random() < 0.7) {
                const typos = this.commonTypos[word];
                words[index] = typos[Math.floor(Math.random() * typos.length)];
                console.log(`✏️  Added typo: "${word}" → "${words[index]}"`);
                return words.join(' ');
            }
        }
        
        // Otherwise, swap adjacent characters
        const wordIndex = Math.floor(Math.random() * words.length);
        const word = words[wordIndex];
        
        if (word.length >= 4) {
            const charIndex = Math.floor(Math.random() * (word.length - 1));
            const chars = word.split('');
            const temp = chars[charIndex];
            chars[charIndex] = chars[charIndex + 1];
            chars[charIndex + 1] = temp;
            words[wordIndex] = chars.join('');
            console.log(`✏️  Added typo: swapped characters in "${word}"`);
        }
        
        return words.join(' ');
    }
}

/**
 * Cooldown manager - forces breaks after heavy usage
 */
class CooldownManager {
    constructor() {
        this.messagesInSession = 0;
        this.sessionStartTime = Date.now();
        this.isOnCooldown = false;
        this.cooldownUntil = null;
        
        // After 50 messages, take a break
        this.messagesBeforeCooldown = 50;
        this.cooldownDuration = 10 * 60 * 1000; // 10 minutes
    }
    
    /**
     * Record a message being sent
     */
    recordMessage() {
        this.messagesInSession++;
        
        // Check if we need a cooldown
        if (this.messagesInSession >= this.messagesBeforeCooldown && !this.isOnCooldown) {
            this.startCooldown();
        }
    }
    
    /**
     * Start cooldown period
     */
    startCooldown() {
        this.isOnCooldown = true;
        this.cooldownUntil = Date.now() + this.cooldownDuration;
        
        console.log(`\n${"=".repeat(60)}`);
        console.log(`⏸️  COOLDOWN: Bot sent ${this.messagesInSession} messages`);
        console.log(`   Taking a ${this.cooldownDuration / 60000} minute break...`);
        console.log(`   Will resume at: ${new Date(this.cooldownUntil).toLocaleTimeString()}`);
        console.log(`${"=".repeat(60)}\n`);
        
        // Auto-resume after cooldown
        setTimeout(() => {
            this.endCooldown();
        }, this.cooldownDuration);
    }
    
    /**
     * End cooldown period
     */
    endCooldown() {
        this.isOnCooldown = false;
        this.cooldownUntil = null;
        this.messagesInSession = 0;
        console.log("✅ Cooldown complete - bot is back online");
    }
    
    /**
     * Check if on cooldown
     * @returns {boolean}
     */
    onCooldown() {
        if (this.isOnCooldown && Date.now() >= this.cooldownUntil) {
            this.endCooldown();
        }
        return this.isOnCooldown;
    }
    
    /**
     * Get time remaining in cooldown
     * @returns {number} Milliseconds
     */
    timeRemaining() {
        if (!this.isOnCooldown) return 0;
        return Math.max(0, this.cooldownUntil - Date.now());
    }
}

// Export utilities
module.exports = {
    randomDelay,
    calculateTypingTime,
    calculateReadingTime,
    RateLimiter,
    getRandomUserAgent,
    BehaviorTracker,
    ActivityScheduler,
    MultiMessageHandler,
    TypoSimulator,
    CooldownManager
};

