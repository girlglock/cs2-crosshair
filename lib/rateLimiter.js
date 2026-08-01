const { Ratelimit } = require("@upstash/ratelimit");
const { redis } = require("./redisClient");
const config = require("./config");

const suspiciousLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "30 m"),
    prefix: "ratelimit:suspicious"
});

const normalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.rateLimit.max, `${config.rateLimit.windowMs} ms`),
    prefix: "ratelimit:normal"
});

module.exports = {
    suspiciousLimiter,
    normalLimiter
};
