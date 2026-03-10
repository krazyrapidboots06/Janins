/**
 * Anti-Detection Configuration Template
 * 
 * Copy these settings to login_safe.js and customize them for your needs.
 * Each profile is optimized for different use cases.
 */

// =============================================================================
// PROFILE 1: MAXIMUM STEALTH (Safest - Use if getting banned frequently)
// =============================================================================
const MAXIMUM_STEALTH = {
    activityScheduler: {
        enabled: true,
        sleepHours: { start: 22, end: 8 }, // 10 PM - 8 AM (10 hours sleep)
        peakHours: [12, 13, 19, 20], // Only lunch & dinner
        slowHours: [6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 21], // Most of day
        weekendSlower: true
    },
    typoSimulator: {
        frequency: 0.05 // 5% chance of typos
    },
    rateLimiter: {
        maxMessagesPerMinute: 5,
        maxMessagesPerHour: 50
    },
    cooldownManager: {
        messagesBeforeCooldown: 30, // Break after 30 messages
        cooldownDuration: 15 * 60 * 1000 // 15 minute breaks
    }
};

// =============================================================================
// PROFILE 2: BALANCED (Default - Recommended for most users)
// =============================================================================
const BALANCED = {
    activityScheduler: {
        enabled: true,
        sleepHours: { start: 23, end: 7 }, // 11 PM - 7 AM (8 hours)
        peakHours: [12, 13, 18, 19, 20, 21], // Lunch & evening
        slowHours: [6, 7, 8, 9, 14, 15], // Morning & afternoon
        weekendSlower: true
    },
    typoSimulator: {
        frequency: 0.03 // 3% chance of typos
    },
    rateLimiter: {
        maxMessagesPerMinute: 10,
        maxMessagesPerHour: 100
    },
    cooldownManager: {
        messagesBeforeCooldown: 50, // Break after 50 messages
        cooldownDuration: 10 * 60 * 1000 // 10 minute breaks
    }
};

// =============================================================================
// PROFILE 3: HIGH PERFORMANCE (Faster but still safer than no protection)
// =============================================================================
const HIGH_PERFORMANCE = {
    activityScheduler: {
        enabled: false, // No sleep/activity restrictions
        sleepHours: { start: 23, end: 7 },
        peakHours: [],
        slowHours: [],
        weekendSlower: false
    },
    typoSimulator: {
        frequency: 0.01 // 1% chance of typos
    },
    rateLimiter: {
        maxMessagesPerMinute: 15,
        maxMessagesPerHour: 150
    },
    cooldownManager: {
        messagesBeforeCooldown: 100, // Break after 100 messages
        cooldownDuration: 5 * 60 * 1000 // 5 minute breaks
    }
};

// =============================================================================
// PROFILE 4: PERSONAL USE (For chatting with friends/family)
// =============================================================================
const PERSONAL_USE = {
    activityScheduler: {
        enabled: true,
        sleepHours: { start: 0, end: 8 }, // Midnight - 8 AM
        peakHours: [12, 13, 14, 18, 19, 20, 21, 22], // Afternoon/evening
        slowHours: [8, 9, 10, 11, 15, 16, 17], // Morning/afternoon
        weekendSlower: true
    },
    typoSimulator: {
        frequency: 0.05 // 5% - casual/friendly
    },
    rateLimiter: {
        maxMessagesPerMinute: 8,
        maxMessagesPerHour: 80
    },
    cooldownManager: {
        messagesBeforeCooldown: 30,
        cooldownDuration: 10 * 60 * 1000
    }
};

// =============================================================================
// PROFILE 5: GROUP MOD BOT (Moderation bot always online)
// =============================================================================
const GROUP_MOD = {
    activityScheduler: {
        enabled: false, // Always online for moderation
        sleepHours: { start: 23, end: 7 },
        peakHours: [],
        slowHours: [],
        weekendSlower: false
    },
    typoSimulator: {
        frequency: 0.01 // 1% - professional
    },
    rateLimiter: {
        maxMessagesPerMinute: 15,
        maxMessagesPerHour: 120
    },
    cooldownManager: {
        messagesBeforeCooldown: 100,
        cooldownDuration: 15 * 60 * 1000 // Longer sessions for moderation
    }
};

// =============================================================================
// PROFILE 6: BUSINESS HOURS (Customer service, office hours only)
// =============================================================================
const BUSINESS_HOURS = {
    activityScheduler: {
        enabled: true,
        sleepHours: { start: 18, end: 9 }, // 6 PM - 9 AM (offline)
        peakHours: [9, 10, 11, 12, 13, 14, 15, 16, 17], // 9-5 workday
        slowHours: [], // Always responsive during work hours
        weekendSlower: false // Could set to false to be offline on weekends
    },
    typoSimulator: {
        frequency: 0 // Professional - no typos
    },
    rateLimiter: {
        maxMessagesPerMinute: 20, // Higher for customer service
        maxMessagesPerHour: 200
    },
    cooldownManager: {
        messagesBeforeCooldown: 150, // Long sessions for business
        cooldownDuration: 10 * 60 * 1000
    }
};

// =============================================================================
// PROFILE 7: NIGHT OWL (Active during night hours)
// =============================================================================
const NIGHT_OWL = {
    activityScheduler: {
        enabled: true,
        sleepHours: { start: 4, end: 14 }, // 4 AM - 2 PM (sleep during day)
        peakHours: [18, 19, 20, 21, 22, 23, 0, 1, 2], // Evening/night
        slowHours: [14, 15, 16, 17], // Just woke up
        weekendSlower: false
    },
    typoSimulator: {
        frequency: 0.03
    },
    rateLimiter: {
        maxMessagesPerMinute: 10,
        maxMessagesPerHour: 100
    },
    cooldownManager: {
        messagesBeforeCooldown: 50,
        cooldownDuration: 10 * 60 * 1000
    }
};

// =============================================================================
// CUSTOM TIMEZONE EXAMPLES
// =============================================================================

// European timezone (GMT+1)
const EUROPEAN_TIME = {
    sleepHours: { start: 23, end: 7 }, // 11 PM - 7 AM
    peakHours: [12, 13, 18, 19, 20, 21]
};

// Asian timezone (GMT+8)
const ASIAN_TIME = {
    sleepHours: { start: 23, end: 7 },
    peakHours: [12, 13, 18, 19, 20, 21, 22]
};

// US Eastern (GMT-5)
const US_EASTERN = {
    sleepHours: { start: 23, end: 7 },
    peakHours: [12, 13, 17, 18, 19, 20]
};

// =============================================================================
// HOW TO APPLY CONFIGURATION
// =============================================================================

/*
1. Choose a profile that matches your use case (or create a custom one)

2. In login_safe.js, replace the initialization sections with your chosen profile:

   // Example: Using MAXIMUM_STEALTH profile
   
   const config = MAXIMUM_STEALTH; // Or BALANCED, HIGH_PERFORMANCE, etc.
   
   const activityScheduler = new ActivityScheduler(config.activityScheduler);
   const typoSimulator = new TypoSimulator(config.typoSimulator.frequency);
   const cooldownManager = new CooldownManager();
   
   // Then modify antiDetection.js to use config values:
   // In RateLimiter constructor:
   this.maxMessagesPerMinute = config.rateLimiter.maxMessagesPerMinute;
   this.maxMessagesPerHour = config.rateLimiter.maxMessagesPerHour;
   
   // In CooldownManager constructor:
   this.messagesBeforeCooldown = config.cooldownManager.messagesBeforeCooldown;
   this.cooldownDuration = config.cooldownManager.cooldownDuration;

3. Test and monitor for 24-48 hours

4. Adjust as needed based on your results
*/

// =============================================================================
// EXPORT (for use in other files)
// =============================================================================
module.exports = {
    MAXIMUM_STEALTH,
    BALANCED,
    HIGH_PERFORMANCE,
    PERSONAL_USE,
    GROUP_MOD,
    BUSINESS_HOURS,
    NIGHT_OWL
};

