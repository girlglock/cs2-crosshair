const config = {
    port: 3001,
    host: 'localhost:3001',
    domain: 'localhost:3001',
    nodeEnv: 'development',
    
    cache: {
        duration: 3 * 60 * 60 * 1000, // 3 hours
        directory: './cache'
    },
    
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100
    },
    
    crosshair: {
        canvasSize: 64,
        maxCodeLength: 45
    },

    patterns: {
        steamID64Pattern: /^7656119\d{10}$/,
        xcodePattern: /^CSGO(-[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]{5}){5}$/
    }
};

module.exports = config;