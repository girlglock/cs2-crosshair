const fs = require('fs');
const path = require('path');
const config = require('../config');

const CACHE_FILE = path.join(config.cache.directory, 'crosshair_cache.json');

// TODO: make cache always use steamid64 as key
function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const cacheData = fs.readFileSync(CACHE_FILE, 'utf8');
            return JSON.parse(cacheData);
        }
    } catch (error) {
        console.error('[error] loading cache:', process.env.NODE_ENV === 'development' ? error : error.message);
    }
    return {};
}

function saveCache(cache) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (error) {
        console.error('[error] saving cache:', process.env.NODE_ENV === 'development' ? error : error.message);
    }
}

function getCachedEntry(identifier) {
    const cache = loadCache();
    const cachedEntry = cache[identifier];

    if (cachedEntry) {
        const now = Date.now();
        const cacheAge = now - cachedEntry.timestamp;

        if (cacheAge < config.cache.duration) {
            console.log(`using cached entry for: ${identifier}`);
            return cachedEntry.data;
        } else {
            console.log(`cache expired for: ${identifier}`);
            delete cache[identifier];
            saveCache(cache);
        }
    }

    return null;
}

function setCachedEntry(identifier, data) {
    const cache = loadCache();
    cache[identifier] = {
        data: data,
        timestamp: Date.now()
    };
    saveCache(cache);
    console.log(`cached entry for: ${identifier}`);
}

module.exports = {
    loadCache,
    saveCache,
    getCachedEntry,
    setCachedEntry
};