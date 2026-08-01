const localDomain = `localhost:${process.env.PORT || 3000}`;
const domain = process.env.PUBLIC_DOMAIN || process.env.VERCEL_URL || localDomain;

const config = {
    domain,
    host: domain,
    allowedHosts: [process.env.PUBLIC_DOMAIN, process.env.VERCEL_URL, localDomain].filter(Boolean),
    nodeEnv: process.env.NODE_ENV || "development",

    cache: {
        duration: 3 * 60 * 60 * 1000
    },

    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100
    },

    crosshair: {
        maxCodeLength: 45
    },

    patterns: {
        steamID64Pattern: /^7656119\d{10}$/,
        xcodePattern: /^CSGO(-[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]{5}){5}$/
    }
};

module.exports = config;
