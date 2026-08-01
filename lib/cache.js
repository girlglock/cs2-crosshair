const { redis, isConfigured } = require("./redisClient");
const config = require("./config");

async function getCachedEntry(identifier) {
    if (!isConfigured) return null;

    try {
        const data = await redis.get(identifier);
        if (data) {
            console.log(`using cached entry for: ${identifier}`);
        }
        return data || null;
    } catch (error) {
        console.error("[error] reading cache:", config.nodeEnv === "development" ? error : error.message);
        return null;
    }
}

async function setCachedEntry(identifier, data) {
    if (!isConfigured) return;

    try {
        await redis.set(identifier, data, { ex: Math.floor(config.cache.duration / 1000) });
        console.log(`cached entry for: ${identifier}`);
    } catch (error) {
        console.error("[error] writing cache:", config.nodeEnv === "development" ? error : error.message);
    }
}

module.exports = {
    getCachedEntry,
    setCachedEntry
};
