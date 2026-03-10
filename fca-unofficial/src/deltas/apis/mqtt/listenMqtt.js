"use strict";
const utils = require('../../../utils');
const mqtt = require('mqtt');
const websocket = require('websocket-stream');
const HttpsProxyAgent = require('https-proxy-agent');
const EventEmitter = require('events');
const { parseDelta } = require('./deltas/value');

let form = {};
let getSeqID;

const accountBlockTracker = {
    consecutiveFailures: 0,
    lastFailureTime: 0,
    isBlocked: false,
    blockReason: null
};

const MQTT_TOPICS = [
    "/legacy_web", "/webrtc", "/rtc_multi", "/onevc", "/br_sr", "/sr_res",
    "/t_ms", "/thread_typing", "/orca_typing_notifications", "/notify_disconnect",
    "/orca_presence", "/inbox", "/mercury", "/messaging_events",
    "/orca_message_notifications", "/pp", "/webrtc_response"
];

const MQTT_CONFIG = {
    KEEPALIVE_INTERVAL: 60,
    CONNECT_TIMEOUT: 60000,
    RECONNECT_PERIOD: 5000,
    MAX_RECONNECT_ATTEMPTS: 10,
    PRESENCE_UPDATE_INTERVAL: 180000,
    IDLE_CHECK_INTERVAL: 120000,
    MAX_IDLE_TIME: 8 * 60 * 1000,
    MIN_RECONNECT_TIME: 4 * 60 * 60 * 1000,
    MAX_RECONNECT_TIME: 8 * 60 * 60 * 1000,
    PROTOCOL_VERSION: 3,
    QOS_LEVEL: 1,
    INITIAL_RETRY_DELAY: 2000,
    MAX_RETRY_DELAY: 30000,
    RETRY_MULTIPLIER: 1.5
};

const SYNC_CONFIG = {
    API_VERSION: 10,
    MAX_DELTAS: 1000,
    BATCH_SIZE: 500,
    ENCODING: "JSON"
};

const mqttReconnectionTracker = {
    attemptCount: 0,
    lastAttemptTime: 0,
    currentDelay: 2000,
    isReconnecting: false
};

function getReconnectionDelay() {
    const delay = Math.min(
        mqttReconnectionTracker.currentDelay,
        MQTT_CONFIG.MAX_RETRY_DELAY
    );
    mqttReconnectionTracker.currentDelay *= MQTT_CONFIG.RETRY_MULTIPLIER;
    return delay;
}

function resetReconnectionState() {
    mqttReconnectionTracker.attemptCount = 0;
    mqttReconnectionTracker.currentDelay = MQTT_CONFIG.INITIAL_RETRY_DELAY;
    mqttReconnectionTracker.isReconnecting = false;
}

function isAccountBlocked(error) {
    const errorMsg = error?.message || '';
    const errorDetail = error?.error || '';
    const originalError = error?.details?.originalError?.error || '';
    
    return errorMsg.includes('Facebook blocked the login') ||
           errorMsg.includes('Not logged in') ||
           errorDetail === 'Not logged in.' ||
           originalError === 'Not logged in.';
}

function handleAccountBlockDetection(error, ctx) {
    if (isAccountBlocked(error)) {
        accountBlockTracker.consecutiveFailures++;
        accountBlockTracker.lastFailureTime = Date.now();
        
        if (accountBlockTracker.consecutiveFailures >= 3) {
            accountBlockTracker.isBlocked = true;
            accountBlockTracker.blockReason = 'Facebook has logged out this account';
            
            ctx.loggedIn = false;
            
            utils.error("\n" + "=".repeat(80));
            utils.error("🚨 ACCOUNT BLOCKED BY FACEBOOK 🚨");
            utils.error("=".repeat(80));
            utils.error("Your Facebook account has been logged out by Facebook's security system.");
            utils.error("");
            utils.error("This happens when:");
            utils.error("  • Facebook detects automated/bot activity");
            utils.error("  • The account was logged in from a suspicious location");
            utils.error("  • Too many rapid actions were performed");
            utils.error("  • The appstate.json is expired or invalid");
            utils.error("");
            utils.error("TO FIX THIS:");
            utils.error("  1. Generate a NEW appstate.json from a fresh browser session");
            utils.error("  2. Use a DIFFERENT Facebook account (this one may be flagged)");
            utils.error("  3. Login to Facebook in a browser first to verify the account");
            utils.error("  4. Wait 24-48 hours before trying again with this account");
            utils.error("");
            utils.error("STOPPING all reconnection attempts to prevent spam...");
            utils.error("=".repeat(80) + "\n");
            
            if (ctx.mqttClient) {
                try {
                    ctx.mqttClient.end(true);
                    ctx.mqttClient = null;
                } catch (e) {
                }
            }
            
            if (ctx.presenceInterval) {
                clearInterval(ctx.presenceInterval);
                ctx.presenceInterval = null;
            }
            
            if (ctx.idleCheckInterval) {
                clearInterval(ctx.idleCheckInterval);
                ctx.idleCheckInterval = null;
            }
            
            return true;
        }
    } else {
        accountBlockTracker.consecutiveFailures = 0;
    }
    
    return false;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getRandomReconnectTime() {
    const range = MQTT_CONFIG.MAX_RECONNECT_TIME - MQTT_CONFIG.MIN_RECONNECT_TIME;
    return Math.floor(Math.random() * (range + 1)) + MQTT_CONFIG.MIN_RECONNECT_TIME;
}

function _calculateTimestamp(previousTimestamp, currentTimestamp) {
    return Math.floor(previousTimestamp + (currentTimestamp - previousTimestamp) + 300);
}

function markAsRead(ctx, api, threadID) {
    if (!ctx.globalOptions.autoMarkRead || !threadID) {
        return;
    }
    
    api.markAsRead(threadID, (err) => {
        if (err) {
            utils.error("autoMarkRead", `Failed to mark thread ${threadID} as read:`, err);
        }
    });
}

function buildMqttUsername(ctx, sessionID) {
    return {
        u: ctx.userID,
        s: sessionID,
        chat_on: ctx.globalOptions.online,
        fg: false,
        d: ctx.clientID,
        ct: 'websocket',
        aid: ctx.mqttAppID,
        mqtt_sid: '',
        cp: 3,
        ecp: 10,
        st: [],
        pm: [],
        dc: '',
        no_auto_fg: true,
        gas: null,
        pack: [],
        a: ctx.globalOptions.userAgent
    };
}

function buildMqttOptions(ctx, host, username) {
    const cookies = ctx.jar.getCookiesSync('https://www.facebook.com').join('; ');
    
    const options = {
        clientId: 'mqttwsclient',
        protocolId: 'MQIsdp',
        protocolVersion: MQTT_CONFIG.PROTOCOL_VERSION,
        username: JSON.stringify(username),
        clean: true,
        wsOptions: {
            headers: {
                'Cookie': cookies,
                'Origin': 'https://www.messenger.com',
                'User-Agent': username.a,
                'Referer': 'https://www.messenger.com/',
                'Host': new URL(host).hostname
            },
            origin: 'https://www.messenger.com',
            protocolVersion: 13,
            binaryType: 'arraybuffer'
        },
        keepalive: MQTT_CONFIG.KEEPALIVE_INTERVAL,
        reschedulePings: true,
        connectTimeout: MQTT_CONFIG.CONNECT_TIMEOUT,
        reconnectPeriod: MQTT_CONFIG.RECONNECT_PERIOD
    };

    if (ctx.globalOptions.proxy) {
        options.wsOptions.agent = new HttpsProxyAgent(ctx.globalOptions.proxy);
    }

    return options;
}

async function listenMqtt(defaultFuncs, api, ctx, globalCallback) {
    try {
        const sessionID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
        
        const domain = "wss://edge-chat.messenger.com/chat";
        const host = ctx.region 
            ? `${domain}?region=${ctx.region.toLowerCase()}&sid=${sessionID}&cid=${ctx.clientID}`
            : `${domain}?sid=${sessionID}&cid=${ctx.clientID}`;

        utils.log("Connecting to MQTT...", host);

        const username = buildMqttUsername(ctx, sessionID);
        const options = buildMqttOptions(ctx, host, username);

        const mqttClient = new mqtt.Client(() => websocket(host, options.wsOptions), options);
        
        mqttClient.publishSync = mqttClient.publish.bind(mqttClient);
        
        mqttClient.publish = (topic, message, opts = {}, callback = () => {}) => {
            return new Promise((resolve, reject) => {
                mqttClient.publishSync(topic, message, opts, (err, data) => {
                    if (err) {
                        callback(err);
                        return reject(err);
                    }
                    callback(null, data);
                    resolve(data);
                });
            });
        };

        ctx.mqttClient = mqttClient;

        mqttClient.on('error', (err) => {
            const errorMsg = err.message || String(err);
            
            if (errorMsg.includes('Server unavailable') || errorMsg.includes('Connection refused')) {
                mqttReconnectionTracker.attemptCount++;
                utils.warn(`⚠️  MQTT server unavailable (attempt ${mqttReconnectionTracker.attemptCount}/${MQTT_CONFIG.MAX_RECONNECT_ATTEMPTS})`);
                
                if (mqttReconnectionTracker.attemptCount >= MQTT_CONFIG.MAX_RECONNECT_ATTEMPTS) {
                    utils.error("❌ Max MQTT reconnection attempts reached. Waiting longer before retry...");
                    mqttReconnectionTracker.currentDelay = MQTT_CONFIG.MAX_RETRY_DELAY;
                }
            }
            
            const networkError = new utils.NetworkError(
                `MQTT connection error: ${errorMsg}`,
                { originalError: err, host, attemptCount: mqttReconnectionTracker.attemptCount }
            );
            utils.error("listenMqtt", networkError);
        });

        mqttClient.on('offline', () => {
            utils.warn("⚠️  MQTT client went offline. Will attempt reconnection...");
            ctx.mqttConnected = false;
        });

        mqttClient.on('close', () => {
            utils.warn("🔌 MQTT connection closed.");
            ctx.mqttConnected = false;
            
            if (accountBlockTracker.isBlocked) {
                utils.log("Reconnection cancelled: Account blocked by Facebook.");
                return;
            }
            
            if (ctx.loggedIn !== false && ctx.globalOptions && ctx.globalOptions.autoReconnect !== false) {
                const reconnectDelay = getReconnectionDelay();
                const delaySeconds = (reconnectDelay / 1000).toFixed(1);
                
                utils.log(`Will attempt reconnection in ${delaySeconds} seconds... (attempt ${mqttReconnectionTracker.attemptCount + 1})`);
                mqttReconnectionTracker.isReconnecting = true;
                
                setTimeout(() => {
                    if (accountBlockTracker.isBlocked) {
                        utils.log("Reconnection cancelled: Account blocked by Facebook.");
                        mqttReconnectionTracker.isReconnecting = false;
                        return;
                    }
                    
                    if (ctx.loggedIn !== false && (!ctx.mqttClient || !ctx.mqttClient.connected)) {
                        utils.log("🔄 Triggering MQTT reconnection...");
                        mqttReconnectionTracker.attemptCount++;
                        getSeqID();
                    } else {
                        utils.log("Reconnection cancelled: Bot logged out or already connected.");
                        mqttReconnectionTracker.isReconnecting = false;
                    }
                }, reconnectDelay);
            } else {
                utils.log("Reconnection disabled or bot logged out.");
            }
        });

        mqttClient.on('reconnect', () => {
            utils.log("🔄 MQTT reconnecting...");
        });

        mqttClient.on('connect', async () => {
            try {
                MQTT_TOPICS.forEach(topic => {
                    mqttClient.subscribe(topic, (err) => {
                        if (err) {
                            utils.error(`Failed to subscribe to ${topic}:`, err);
                        }
                    });
                });

                const queue = {
                    sync_api_version: SYNC_CONFIG.API_VERSION,
                    max_deltas_able_to_process: SYNC_CONFIG.MAX_DELTAS,
                    delta_batch_size: SYNC_CONFIG.BATCH_SIZE,
                    encoding: SYNC_CONFIG.ENCODING,
                    entity_fbid: ctx.userID
                };

                let syncTopic;
                if (ctx.syncToken) {
                    syncTopic = "/messenger_sync_get_diffs";
                    queue.last_seq_id = ctx.lastSeqId;
                    queue.sync_token = ctx.syncToken;
                } else {
                    syncTopic = "/messenger_sync_create_queue";
                    queue.initial_titan_sequence_id = ctx.lastSeqId;
                    queue.device_params = null;
                }

                utils.log("✅ Successfully connected to MQTT");
                ctx.mqttConnected = true;
                
                resetReconnectionState();

                try {
                    const { name: botName = "Facebook User", uid = ctx.userID } = 
                        await api.getBotInitialData();
                    utils.log(`👤 Logged in as: ${botName} (${uid})`);
                } catch (botInfoErr) {
                    utils.warn("Could not retrieve bot info:", botInfoErr.message);
                }

                await mqttClient.publish(
                    syncTopic, 
                    JSON.stringify(queue), 
                    { qos: MQTT_CONFIG.QOS_LEVEL, retain: false }
                );
            } catch (connectErr) {
                utils.error("Error in connect handler:", connectErr);
                globalCallback(new utils.NetworkError(
                    "Failed to initialize MQTT connection",
                    { originalError: connectErr }
                ));
            }
        });

        let presenceInterval;
        const idleCheckInterval = setInterval(() => {
            if (!ctx.lastMessageTime) {
                return;
            }

            const timeSinceLastMessage = Date.now() - ctx.lastMessageTime;
            
            if (timeSinceLastMessage > MQTT_CONFIG.MAX_IDLE_TIME) {
                if (mqttClient && mqttClient.connected) {
                    utils.warn(`⚠️  MQTT idle for ${Math.floor(timeSinceLastMessage / 1000)}s. Testing connection...`);
                    
                    try {
                        const testPayload = utils.generatePresence(ctx.userID);
                        mqttClient.publish(
                            '/orca_presence',
                            JSON.stringify({ "p": testPayload }),
                            { qos: 1, retain: false },
                            (err) => {
                                if (err) {
                                    utils.error("Connection test failed. Forcing reconnection...");
                                    if (ctx.reconnectMqtt) {
                                        ctx.reconnectMqtt().catch(e => utils.error("Reconnect failed:", e));
                                    }
                                } else {
                                    utils.log("✅ Connection test passed. MQTT is responsive.");
                                }
                            }
                        );
                    } catch (testErr) {
                        utils.error("Connection test error. Forcing reconnection...");
                        if (ctx.reconnectMqtt) {
                            ctx.reconnectMqtt().catch(e => utils.error("Reconnect failed:", e));
                        }
                    }
                }
            }
        }, MQTT_CONFIG.IDLE_CHECK_INTERVAL);

        ctx.idleCheckInterval = idleCheckInterval;
        
        if (ctx.globalOptions.updatePresence) {
            presenceInterval = setInterval(() => {
                if (!mqttClient || !mqttClient.connected) {
                    return;
                }

                try {
                    const presencePayload = utils.generatePresence(ctx.userID);
                    mqttClient.publish(
                        '/orca_presence',
                        JSON.stringify({ "p": presencePayload }),
                        { qos: 0, retain: false },
                        (err) => {
                            if (err) {
                                utils.error("Failed to send presence update:", err);
                            }
                        }
                    );
                } catch (presenceErr) {
                    utils.error("Error generating presence update:", presenceErr);
                }
            }, MQTT_CONFIG.PRESENCE_UPDATE_INTERVAL);

            ctx.presenceInterval = presenceInterval;
        }

        ctx.lastMessageTime = Date.now();
        ctx.messageCount = 0;

        mqttClient.on('message', async (topic, message, _packet) => {
            try {
                ctx.lastMessageTime = Date.now();
                ctx.messageCount++;

                const jsonMessage = JSON.parse(message.toString());
                
                if (topic === "/t_ms") {
                    if (jsonMessage.lastIssuedSeqId) {
                        ctx.lastSeqId = parseInt(jsonMessage.lastIssuedSeqId, 10);
                    }

                    if (jsonMessage.deltas && Array.isArray(jsonMessage.deltas)) {
                        for (const delta of jsonMessage.deltas) {
                            try {
                                parseDelta(defaultFuncs, api, ctx, globalCallback, { delta });
                            } catch (deltaErr) {
                                utils.error("Error parsing delta:", deltaErr);
                            }
                        }
                    }
                } else if (topic === "/mercury" || topic === "/messaging_events" || topic === "/orca_message_notifications") {
                    if (jsonMessage.deltas && Array.isArray(jsonMessage.deltas)) {
                        for (const delta of jsonMessage.deltas) {
                            try {
                                parseDelta(defaultFuncs, api, ctx, globalCallback, { delta });
                            } catch (deltaErr) {
                                utils.error("Error parsing delta from " + topic + ":", deltaErr);
                            }
                        }
                    }
                } else if (topic === "/thread_typing" || topic === "/orca_typing_notifications") {
                    const typingEvent = {
                        type: "typ",
                        isTyping: !!jsonMessage.state,
                        from: jsonMessage.sender_fbid?.toString() || "",
                        threadID: utils.formatID(
                            (jsonMessage.thread || jsonMessage.sender_fbid)?.toString() || ""
                        ),
                        fromMobile: jsonMessage.from_mobile || false
                    };
                    globalCallback(null, typingEvent);
                }
            } catch (parseErr) {
                utils.error(`Error processing message from topic ${topic}:`, parseErr);
            }
        });

    } catch (setupErr) {
        const error = new utils.NetworkError(
            "Failed to setup MQTT listener",
            { originalError: setupErr }
        );
        utils.error("listenMqtt setup error:", error);
        globalCallback(error);
    }
}

module.exports = (defaultFuncs, api, ctx) => {
    let globalCallback = () => {};
    let reconnectInterval;

    getSeqID = async () => {
        try {
            if (accountBlockTracker.isBlocked) {
                utils.log("Skipping getSeqID: Account blocked by Facebook.");
                return;
            }
            
            utils.log("Fetching sequence ID...");
            
            form = {
                "queries": JSON.stringify({
                    "o0": {
                        "doc_id": "3336396659757871",
                        "query_params": {
                            "limit": 1,
                            "before": null,
                            "tags": ["INBOX"],
                            "includeDeliveryReceipts": false,
                            "includeSeqID": true
                        }
                    }
                })
            };

            const resData = await defaultFuncs
                .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, defaultFuncs));

            if (utils.getType(resData) !== "Array") {
                throw new utils.ValidationError("Invalid response format from sequence ID endpoint");
            }

            if (resData.error && resData.error !== 1357001) {
                throw new utils.AuthenticationError(
                    "Authentication error while fetching sequence ID",
                    { errorCode: resData.error }
                );
            }

            ctx.lastSeqId = resData[0]?.o0?.data?.viewer?.message_threads?.sync_sequence_id;
            
            if (!ctx.lastSeqId) {
                throw new utils.ValidationError("Sequence ID not found in response");
            }

            utils.log(`✅ Sequence ID retrieved: ${ctx.lastSeqId}`);
            
            accountBlockTracker.consecutiveFailures = 0;

            listenMqtt(defaultFuncs, api, ctx, globalCallback);
            
        } catch (err) {
            const shouldStop = handleAccountBlockDetection(err, ctx);
            
            if (shouldStop) {
                return;
            }
            
            const authError = new utils.AuthenticationError(
                "Failed to get sequence ID. This is often caused by an invalid or expired appstate. " +
                "Please try generating a new appstate.json file.",
                { originalError: err }
            );
            utils.error("getSeqID error:", authError);
            return globalCallback(authError);
        }
    };

    ctx.reconnectMqtt = async () => {
        try {
            if (accountBlockTracker.isBlocked) {
                utils.log("Skipping reconnect: Account blocked by Facebook.");
                return;
            }
            
            utils.log("🔄 Reconnecting MQTT...");
            
            if (ctx.mqttClient) {
                try {
                    ctx.mqttClient.end(true);
                } catch (endErr) {
                    utils.error("Error ending MQTT client:", endErr);
                }
                ctx.mqttClient = null;
            }
            
            ctx.clientID = generateUUID();
            await getSeqID();
        } catch (err) {
            utils.error("Failed to reconnect MQTT:", err);
            throw err;
        }
    };

    return async (callback) => {
        class MessageEmitter extends EventEmitter {
            stop() {
                utils.log("Stopping MQTT listener...");
                
                globalCallback = () => {};
                
                if (reconnectInterval) {
                    clearTimeout(reconnectInterval);
                    reconnectInterval = null;
                }
                
                if (ctx.presenceInterval) {
                    clearInterval(ctx.presenceInterval);
                    ctx.presenceInterval = null;
                }
                
                if (ctx.idleCheckInterval) {
                    clearInterval(ctx.idleCheckInterval);
                    ctx.idleCheckInterval = null;
                }
                
                if (ctx.mqttClient) {
                    try {
                        ctx.mqttClient.end();
                        ctx.mqttClient = undefined;
                    } catch (err) {
                        utils.error("Error stopping MQTT client:", err);
                    }
                }
                
                this.emit('stop');
                utils.log("✅ MQTT listener stopped");
            }
        }

        const msgEmitter = new MessageEmitter();

        globalCallback = (error, message) => {
            if (error) {
                return msgEmitter.emit("error", error);
            }
            
            if (message && (message.type === "message" || message.type === "message_reply")) {
                markAsRead(ctx, api, message.threadID);
            }
            
            msgEmitter.emit("message", message);
        };

        if (typeof callback === 'function') {
            const userCallback = callback;
            globalCallback = (error, message) => {
                try {
                    userCallback(error, message);
                } catch (callbackError) {
                    utils.error("Error in user callback (message handler):", callbackError);
                    if (!error) {
                        msgEmitter.emit("error", callbackError);
                    }
                }
            };
        }

        if (!ctx.firstListen || !ctx.lastSeqId) {
            await getSeqID();
        } else {
            listenMqtt(defaultFuncs, api, ctx, globalCallback);
        }

        if (ctx.firstListen && ctx.globalOptions.autoMarkRead) {
            try {
                utils.log("Marking all messages as read on startup...");
                await api.markAsReadAll();
            } catch (err) {
                utils.warn("Failed to mark all messages as read on startup:", err.message || err);
            }
        }

        ctx.firstListen = false;

        async function scheduleReconnect() {
            const time = getRandomReconnectTime();
            const hours = Math.floor(time / 3600000);
            const minutes = Math.floor((time % 3600000) / 60000);
            const timeStr = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} minutes`;
            utils.log(`🔄 Scheduled reconnect in ${timeStr} (${time}ms)`);
            
            reconnectInterval = setTimeout(() => {
                utils.log("⏰ Reconnecting MQTT with new clientID...");
                
                if (ctx.mqttClient) {
                    try {
                        ctx.mqttClient.end(true);
                    } catch (err) {
                        utils.error("Error ending existing connection:", err);
                    }
                }
                
                ctx.clientID = generateUUID();
                listenMqtt(defaultFuncs, api, ctx, globalCallback);
                
                scheduleReconnect();
            }, time);
        }

        scheduleReconnect();

        return msgEmitter;
    };
};
