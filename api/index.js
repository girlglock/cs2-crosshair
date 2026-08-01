const express = require("express");
const path = require("path");

const config = require("../lib/config");
const { getCrosshairHandler } = require("../lib/mainHandler");
const { sanitizePath, hostValidation, securityHeaders, checkRateLimit } = require("../lib/secs");
const { CS2CrosshairRenderer } = require("../public/static/crosshairRenderer");
const { renderCrosshairGif } = require("../lib/gifRenderer");

const app = express();

app.set("trust proxy", true);

app.use(express.static(path.join(__dirname, "..", "public"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith(".avif")) {
            res.setHeader("Content-Type", "image/avif");
        }
    }
}));

app.use(checkRateLimit);
app.use(sanitizePath);
app.use(hostValidation);
app.use(securityHeaders);

app.get(/^(?!\/image\/).*\.(ico|png|jpg|jpeg|gif|svg|css|js|txt|xml)$/i, (req, res) => res.status(204).end());

app.get("/image/:filename", (req, res) => {
    const filename = req.params.filename;
    let crosshairCode = filename.replace(/\.(png|gif)$/i, "");

    crosshairCode = crosshairCode.split("/")[0];
    crosshairCode = crosshairCode.replace(/[\\:*?"<>|]/g, "");

    if (!config.patterns.xcodePattern.test(crosshairCode)) {
        return res.status(400).json({ error: "invalid crosshair code image cache format" });
    }

    try {
        const renderer = new CS2CrosshairRenderer();
        const settings = renderer.parseCode(crosshairCode);
        const isClassic = parseInt(settings.cl_crosshairstyle) === 2;

        if (isClassic) {
            const gifBuffer = renderCrosshairGif(renderer, settings, 1080);
            res.set({
                "Content-Type": "image/gif",
                "Cache-Control": "public, max-age=3600"
            });
            return res.send(gifBuffer);
        }

        const canvas = renderer.renderCrosshair(settings, 1080);
        const imageBuffer = canvas.toBuffer("image/png");

        res.set({
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600"
        });
        res.send(imageBuffer);

    } catch (error) {
        console.error("[error] generating crosshair image:", error);
        res.status(500).json({ error: "failed to generate image" });
    }
});

const getUsageResponse = () => ({
    status: "okak",
    service: "silly cs2 crosshair generator :3c",
    usage: [
        `https://${config.domain}/{crosshair-code}`,
        `https://${config.domain}/{steamid64}`,
        `https://${config.domain}/profiles/{steamid64}`,
        `https://${config.domain}/id/{steamvanity}`,
        `https://${config.domain}/{leetifyvanity}`
    ],
    examples: [
        "CSGO-AJswe-2jNcK-nMpEQ-rHV5J-5JWAB",
        "76561198123456789",
        "profiles/76561198123456789",
        "id/exampleuser",
        "ropz"
    ]
});

app.get("/", (req, res) => getCrosshairHandler(req, res));

app.get("/id", (req, res) => res.json(getUsageResponse()));
app.get("/id/", (req, res) => res.json(getUsageResponse()));
app.get("/id/:username", (req, res) => {
    const username = req.params.username;
    if (!username || username.length > config.crosshair.maxCodeLength || /[<>\"'&]/.test(username)) {
        return res.status(400).json({ error: "invalid format >:(" });
    }
    req.params.code = `id/${username}`;
    getCrosshairHandler(req, res);
});

app.get("/profiles", (req, res) => res.json(getUsageResponse()));
app.get("/profiles/", (req, res) => res.json(getUsageResponse()));
app.get("/profiles/:username", (req, res) => {
    const username = req.params.username;
    if (!username || username.length > config.crosshair.maxCodeLength || /[<>\"'&]/.test(username)) {
        return res.status(400).json({ error: "invalid format >:(" });
    }
    req.params.code = `profiles/${username}`;
    getCrosshairHandler(req, res);
});

app.get("/c", (req, res) => res.json(getUsageResponse()));
app.get("/c/", (req, res) => res.json(getUsageResponse()));
app.get("/c/id", (req, res) => res.json(getUsageResponse()));
app.get("/c/id/", (req, res) => res.json(getUsageResponse()));
app.get("/c/id/:username", (req, res) => {
    const username = req.params.username;
    if (!username || username.length > config.crosshair.maxCodeLength || /[<>\"'&]/.test(username)) {
        return res.status(400).json({ error: "invalid format >:(" });
    }
    req.params.code = `id/${username}`;
    getCrosshairHandler(req, res, true);
});

app.get(/^\/((?!id\/?$|id\/|profiles\/?$|profiles\/|image\/).+)$/, (req, res) => {
    const code = req.params[0];
    if (!code || code.length > config.crosshair.maxCodeLength) {
        return res.status(400).json({ error: "invalid code parameter >:(" });
    }
    req.params.code = code;
    getCrosshairHandler(req, res);
});

app.use((req, res) => {
    res.status(404).json({
        error: "not found :p",
        usage: getUsageResponse().usage
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "something went wwong" });
});

module.exports = app;
