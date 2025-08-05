const express = require('express');

// @ts-ignore
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getCrosshairHandler } = require('./services/mainHandler');
const { sanitizePath, hostValidation, securityHeaders } = require('./middleware/sec');
const { CS2CrosshairRenderer } = require('./services/crosshairRenderer');

const app = express();

app.set('trust proxy', '127.0.0.1');

const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: { error: 'too many requests, please try again later :c' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);
app.use(sanitizePath);
app.use(hostValidation);
app.use(securityHeaders);

app.get(/\.(ico|png|jpg|jpeg|gif|svg|css|js|txt|xml)$/i, (req, res) => res.status(204).end());

// for embed bots
app.get('/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const crosshairCode = filename.replace(/\.png$/, '');

    if (!config.patterns.xcodePattern.test(crosshairCode)) {
        return res.status(400).json({ error: 'invalid crosshair code format' });
    }

    const cacheFile = path.join(config.cache.directory, `${crosshairCode}.png`);

    if (fs.existsSync(cacheFile)) {
        res.set({
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600', //1hour
        });
        return res.sendFile(path.resolve(cacheFile));
    }

    try {
        const renderer = new CS2CrosshairRenderer();
        const settings = renderer.parseCode(crosshairCode);
        const canvas = renderer.renderCrosshair(settings, config.crosshair.canvasSize);
        const imageBuffer = canvas.toBuffer('image/png');

        if (!fs.existsSync(config.cache.directory)) {
            fs.mkdirSync(config.cache.directory, { recursive: true });
        }
        fs.writeFileSync(cacheFile, imageBuffer);

        res.set({
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600', //1hour
        });
        res.send(imageBuffer);

    } catch (error) {
        console.error('error generating crosshair image:', error);
        res.status(500).json({ error: 'failed to generate image' });
    }
});

const getUsageResponse = () => ({
    status: 'okak',
    service: 'silly cs2 crosshair generator :3c',
    usage: [
        `https://${config.domain}/{crosshair-code}`,
        `https://${config.domain}/{steamid64}`,
        `https://${config.domain}/profiles/{steamid64}`,
        `https://${config.domain}/id/{steamvanity}`,
        `https://${config.domain}/{leetifyvanity}`
    ],
    examples: [
        'CSGO-AJswe-2jNcK-nMpEQ-rHV5J-5JWAB',
        '76561198123456789',
        'profiles/76561198123456789',
        'id/exampleuser',
        'ropz'
    ]
});

app.get('/',  (req, res) => getCrosshairHandler(req, res));

app.get('/id', (req, res) => res.json(getUsageResponse()));
app.get('/id/', (req, res) => res.json(getUsageResponse()));
app.get('/id/:username', (req, res) => {
    const username = req.params.username;
    if (!username || username.length > config.crosshair.maxCodeLength || /[<>\"'&]/.test(username)) {
        return res.status(400).json({ error: 'invalid format >:(' });
    }
    req.params.code = `id/${username}`;
    getCrosshairHandler(req, res);
});

app.get('/profiles', (req, res) => res.json(getUsageResponse()));
app.get('/profiles/', (req, res) => res.json(getUsageResponse()));
app.get('/profiles/:username', (req, res) => {
    const username = req.params.username;
    if (!username || username.length > config.crosshair.maxCodeLength || /[<>\"'&]/.test(username)) {
        return res.status(400).json({ error: 'invalid format >:(' });
    }
    req.params.code = `profiles/${username}`;
    getCrosshairHandler(req, res);
});

app.get(/^\/((?!id\/?$|id\/|profiles\/?$|profiles\/|image\/).+)$/, (req, res) => {
    const code = req.params[0];
    if (!code || code.length > config.crosshair.maxCodeLength) {
        return res.status(400).json({ error: 'invalid code parameter >:(' });
    }
    req.params.code = code;
    getCrosshairHandler(req, res);
});

app.use((req, res) => {
    res.status(404).json({
        error: 'not found :p',
        usage: getUsageResponse().usage
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'something went wwong' });
});

app.listen(config.port, () => {
    console.log(`cs2-crosshair running on ${config.host} (${config.port}) :3c`);
});