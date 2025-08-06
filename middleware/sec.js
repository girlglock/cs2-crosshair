const config = require('../config');
// @ts-ignore
const rateLimit = require('express-rate-limit');

const allowedPathRegex = /^[a-zA-Z0-9\-_/]*$/;

const blockedUserAgents = [
    /curl/i,
    /wget/i,
    /python-requests/i,
    /java/i,
    /libwww-perl/i,
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /acunetix/i,
    /fuzz/i,
    /scanner/i,
    /postman/i,
];

const blockedPatterns = [
    /\/\.git/i,
    /\/\.env/i,
    /\/\.ssh/i,
    /\/\.aws/i,
    /\/\.npm/i,
    /\/\.yarn/i,
    /\/\.htaccess/i,
    /\/\.htpasswd/i,
    /\/\.well-known/i,

    /\/node_modules/i,
    /\/package\.json/i,
    /\/package-lock\.json/i,
    /\/yarn\.lock/i,

    /\/config\//i,
    /\/logs?\//i,
    /\/backup/i,
    /\/tmp/i,
    /\/temp/i,
    // /\/cache/i,
    /\/proc\//i,
    /\/etc\//i,
    /\/var\//i,
    /\/usr\//i,
    /\/bin\//i,
    /\/sbin\//i,
    /\/boot\//i,
    /\/root\//i,
    /\/home\//i,

    /server\.js$/i,
    /app\.js$/i,
    /index\.js$/i,
    /\/controllers?\//i,
    /\/middleware\//i,
    /\/routes?\//i,
    /\/models?\//i,
    /\/views?\//i,
    /\/database\//i,
    /\/db\//i,

    /\/sql\//i,
    /\.sql$/i,
    /\.log$/i,

    /\.bak$/i,
    /\.backup$/i,
    /\.old$/i,
    /\.orig$/i,
    /\.swp$/i,
    /\.tmp$/i,
    /\.DS_Store$/i,
    /Thumbs\.db$/i,

    /\/_profiler$/i,
    /\/phpinfo$/i,
    /\/metadata$/i,
    /\/fhir-server\/api\/v[0-9]+\/metadata$/i,
    /\/baseR\d+\/metadata$/i,
    /\/r\d+\/metadata$/i,
    /\/fhir\/metadata$/i,
    /\/baseDstu[23]\/metadata$/i,
    /\?s=33\b/i,
    /\+CSCOE\+\/logon\.html$/i,
    /global-protect\/login\.esp$/i,
    /dana-na\/auth\/url_default\/welcome\.cgi$/i,
    /\/\.env$/i,
    /\/robots\.txt$/i,
];

const attackPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /(<|%3C).*script.*(>|%3E)/i,
    /union.*select/i,
    /select.*from/i,
    /insert\s+into/i,
    /drop\s+table/i,
    /update\s+.*set/i,
    /delete\s+from/i,
    /<img/i,
];

const isSuspiciousRequest = (req) => {
    const originalUrl = req.originalUrl;
    const ua = req.get('User-Agent') || '';
    
    let decodedUrl;
    try {
        decodedUrl = decodeURIComponent(originalUrl);
    } catch (error) {
        return true;
    }

    if (blockedUserAgents.some(pattern => pattern.test(ua))) {
        return true;
    }

    if (decodedUrl.includes('..') || 
        decodedUrl.includes('\\') || 
        decodedUrl.includes('%2e%2e') || 
        decodedUrl.includes('%5c')) {
        return true;
    }

    if (decodedUrl.includes('\0') || decodedUrl.includes('%00')) {
        return true;
    }

    const isImagePath = /^\/image\/CSGO(-[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]{5}){5}$/.test(decodedUrl);
    if (!isImagePath && blockedPatterns.some(pattern => pattern.test(decodedUrl))) {
        return true;
    }

    if (attackPatterns.some(pattern => pattern.test(decodedUrl))) {
        return true;
    }

    if (req.query) {
        for (const key in req.query) {
            const val = req.query[key];
            if (attackPatterns.some(p => p.test(val))) {
                return true;
            }
        }
    }

    if (decodedUrl.length > 100) {
        return true;
    }

    return false;
};

const suspiciousLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    message: { error: 'too many sus requests detected' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !isSuspiciousRequest(req),
});

const normalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: { error: 'too many requests, please try again later :c' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isSuspiciousRequest(req),
});

const checkRateLimit = (req, res, next) => {
    if (isSuspiciousRequest(req)) {
        suspiciousLimiter(req, res, next);
    } else {
        normalLimiter(req, res, next);
    }
};

const sanitizePath = (req, res, next) => {
    const originalUrl = req.originalUrl;
    let decodedUrl;

    const ua = req.get('User-Agent') || '';
    for (const pattern of blockedUserAgents) {
        if (pattern.test(ua)) {
            const ip = req.ip || req.connection.remoteAddress;
            console.warn(`[warn] blocked useragent: ${ua} - IP: ${ip}`);
            return res.status(403).json({ error: 'sussy' });
        }
    }

    try {
        decodedUrl = decodeURIComponent(originalUrl);
    } catch (error) {
        const ip = req.ip || req.connection.remoteAddress;
        console.error(`[error] malformed URI: ${originalUrl} - IP: ${ip}`);
        return res.status(400).json({ error: 'malformed url' });
    }

    const isImagePath = /^\/image\/CSGO(-[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]{5}){5}$/.test(decodedUrl);

    if (!allowedPathRegex.test(decodedUrl) && decodedUrl !== "/favicon.ico" && !isImagePath) {
        const ip = req.ip || req.connection.remoteAddress;
        if (isSuspiciousRequest(req)) {
            console.warn(`[warn] invalid chars in suspicious URL: ${decodedUrl} - IP: ${ip}`);
        }
        return res.status(400).json({ error: 'sus characters in url' });
    }

    if (
        decodedUrl.includes('..') ||
        decodedUrl.includes('\\') ||
        decodedUrl.includes('%2e%2e') ||
        decodedUrl.includes('%5c')
    ) {
        const ip = req.ip || req.connection.remoteAddress;
        console.warn(`[warn] path traversal attempt: ${decodedUrl} - IP: ${ip}`);
        return res.status(403).json({ error: 'sus' });
    }

    if (!isImagePath) {
        for (const pattern of blockedPatterns) {
            if (pattern.test(decodedUrl)) {
                const ip = req.ip || req.connection.remoteAddress;
                console.warn(`[warn] blocked path detected: ${decodedUrl} - IP: ${ip}`);
                return res.status(403).json({ error: 'sus' });
            }
        }
    }

    if (decodedUrl.includes('\0') || decodedUrl.includes('%00')) {
        const ip = req.ip || req.connection.remoteAddress;
        console.warn(`[warn] null byte injection: ${decodedUrl} - IP: ${ip}`);
        return res.status(403).json({ error: 'null byte detected' });
    }

    if (req.query) {
        for (const key in req.query) {
            const val = req.query[key];
            if (attackPatterns.some(p => p.test(val))) {
                const ip = req.ip || req.connection.remoteAddress;
                console.warn(`[warn] blocked suspicious query param: ${key}=${val} - IP: ${ip}`);
                return res.status(403).json({ error: 'sus' });
            }
        }
    }

    for (const pattern of attackPatterns) {
        if (pattern.test(decodedUrl)) {
            const ip = req.ip || req.connection.remoteAddress;
            console.warn(`[warn] blocked attack pattern in URL: ${decodedUrl} - IP: ${ip}`);
            return res.status(403).json({ error: 'sus' });
        }
    }

    if (decodedUrl.length > 100) {
        const ip = req.ip || req.connection.remoteAddress;
        console.warn(`[warn] URL too long (${decodedUrl.length} chars): ${decodedUrl.substring(0, 50)}... - IP: ${ip}`);
        return res.status(413).json({ error: 'URL too wong' });
    }

    next();
};

const hostValidation = (req, res, next) => {
    const host = req.get('Host');
    if (host !== config.host) {
        const ip = req.ip || req.connection.remoteAddress;
        console.error(`[error] invalid host header: ${host} - IP: ${ip}`);
        return res.status(403).json({ error: 'access denied' });
    }
    next();
};

const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
};

module.exports = {
    sanitizePath,
    hostValidation,
    securityHeaders,
    checkRateLimit,
    isSuspiciousRequest,
};