const { Redis } = require("@upstash/redis");

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const isConfigured = Boolean(url && token);

const redis = isConfigured
    ? new Redis({ url, token, retry: { retries: 1, backoff: () => 100 } })
    : null;

module.exports = { redis, isConfigured };
