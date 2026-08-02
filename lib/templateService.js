const fs = require("fs");
const path = require("path");
const config = require("./config");

const templateCache = new Map();

function loadTemplate(templateName) {
    if (templateCache.has(templateName)) {
        return templateCache.get(templateName);
    }

    const templatePath = path.join(__dirname, "templates", `${templateName}.html`);

    try {
        const template = fs.readFileSync(templatePath, "utf8");
        templateCache.set(templateName, template);
        return template;
    } catch (error) {
        console.error(`[error] loading template ${templateName}:`, config.nodeEnv === "development" ? error : error.message);
        return null;
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function raw(value) {
    return { __raw: true, value };
}

function renderTemplate(templateName, variables = {}) {
    const template = loadTemplate(templateName);
    if (!template) {
        return null;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (!(key in variables)) {
            return match;
        }
        const value = variables[key];
        if (value && typeof value === "object" && value.__raw) {
            return value.value;
        }
        return escapeHtml(value);
    });
}

function getColorFromSettings(settings) {
    const colorIndex = settings.cl_crosshaircolor;

    if (colorIndex === 5) {
        return [settings.cl_crosshaircolor_r, settings.cl_crosshaircolor_g, settings.cl_crosshaircolor_b];
    }

    const presetColors = {
        0: [255, 0, 0],
        1: [0, 255, 0],
        2: [255, 255, 0],
        3: [0, 0, 255],
        4: [0, 255, 255]
    };

    return presetColors[colorIndex] || [160, 255, 255];
}

function toHex(n) {
    return n.toString(16).padStart(2, "0");
}

function buildUsageExamples() {
    const examples = [
        "CSGO-VHcPj-yPL6x-NAHqX-s2yyW-o2OtQ",
        "76561198123456789",
        "profiles/76561198123456789",
        "id/some_steam_vanity",
        "some_leetify_vanity"
    ];

    return examples
        .map(example => `${escapeHtml(config.domain)}/${escapeHtml(example)}`)
        .join("<br>• ");
}

function buildJsonIsland(payload) {
    return JSON.stringify(payload)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
}

function generateHTML(player, settings, imageUrl, errorType = "", originalInput = "", isBot = false) {
    if (errorType !== "") {
        return renderTemplate("error", {
            originalInput,
            errorType,
            domain: config.domain,
            usageExamples: raw(buildUsageExamples())
        });
    }

    const shareCode = player.crosshairData.current?.shareCode;
    const title = shareCode === originalInput
        ? "cs2-crosshair-viewer"
        : `${player.nickname}'s crosshair`;

    if (isBot) {
        const [r, g, b] = settings ? getColorFromSettings(settings) : [0, 255, 0];
        const themeColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        const isClassic = settings && parseInt(settings.cl_crosshairstyle) === 2;

        const playerEmbedInfo = player.nickname && player.cs2Hours
            ? `${player.nickname} • ${player.cs2Hours}\n`
            : (player.nickname ? `${player.nickname}\n` : "");

        return renderTemplate("discord-embed", {
            title,
            playerEmbedInfo,
            codeValue: shareCode === "CSGO-cXRt7-URURp-wo2kd-n4VTi-oTc3K"
                ? "search and view cs2 player crosshairs"
                : shareCode,
            imageUrl,
            imageType: isClassic ? "image/gif" : "image/png",
            themeColor,
            domain: config.domain
        });
    }

    const payload = {
        nickname: player.nickname || null,
        cs2Hours: player.cs2Hours || null,
        steamId64: player.steamId64 || null,
        avatarUrl: player.avatarUrl || null,
        playerType: player.playerType,
        shareCode: shareCode || null,
        lastUsedAt: player.crosshairData.current?.lastUsedAt || null,
        stats: player.crosshairData.current?.stats || null,
        previous: (player.crosshairData.previous || []).map(ch => ({
            shareCode: ch.shareCode,
            lastUsedAt: ch.lastUsedAt,
            stats: ch.stats || null
        })),
        originalInput
    };

    return renderTemplate("crosshair-preview", {
        title,
        domain: config.domain,
        dataJson: raw(buildJsonIsland(payload))
    });
}

module.exports = { generateHTML };
