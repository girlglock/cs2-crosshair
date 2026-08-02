const config = require("./config");
const { CS2CrosshairRenderer } = require("../public/static/crosshairRenderer");
const { getCrosshairData } = require("./playerService");
const { generateHTML } = require("./templateService");
const { getCachedEntry, setCachedEntry } = require("./cache");

const DEFAULT_CODE = "CSGO-cXRt7-URURp-wo2kd-n4VTi-oTc3K";
const renderer = new CS2CrosshairRenderer();

async function processUserInput(input) {
    const cacheIdentifier = (input.endsWith("/") ? input.slice(0, -1) : input).replace(/^profiles\//, "");

    if (input.startsWith("CSGO-")) {
        return {
            crosshairData: {
                current: {
                    shareCode: input
                },
            },
            nickname: "",
            cs2Hours: "",
            playerType: "code"
        };
    }

    const cachedCrosshair = await getCachedEntry(cacheIdentifier);
    if (cachedCrosshair) {
        return cachedCrosshair;
    }

    let steamID64, username, playerType;

    if (input.startsWith("id/")) {
        username = `id/${input.substring(3)}`;
        playerType = "steam_vanity";
    } else if (config.patterns.steamID64Pattern.test(input)) {
        steamID64 = input;
        username = `profiles/${steamID64}`;
        playerType = "steam_id";
    } else if (input.startsWith("profiles/") && config.patterns.steamID64Pattern.test(input.substring(9))) {
        username = input.substring(9);
        playerType = "steam_profile";
    } else if (!config.patterns.steamID64Pattern.test(input)) {
        username = input.split(/[/\s]/)[0];
        playerType = "leetify";
    }

    try {
        const result = await getCrosshairData(username, playerType);

        if (!result.crosshairData.current.shareCode) {
            throw new Error(`crosshair not found for ${username}`);
        }

        await setCachedEntry(cacheIdentifier, result);
        return result;

    } catch (error) {
        if (config.nodeEnv === "development") console.error("[error] processing user input:", error.message);
        throw error;
    }
}

function sanitizeShareCodeForUrl(shareCode) {
    return shareCode.split("/")[0].replace(/[\\:*?"<>|]/g, "");
}

function getTimeAgo(dateString) {
    if (!dateString) return "";

    try {
        const now = new Date();
        const past = new Date(dateString);
        const diffDays = Math.floor((now - past) / (1000 * 60 * 60 * 24));
        return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
    } catch (error) {
        return "";
    }
}

function buildVersionList(player) {
    const current = player.crosshairData?.current;
    if (!current?.lastUsedAt || !current?.shareCode) return [];

    const list = [{ shareCode: current.shareCode }];

    const uniquePrevious = (player.crosshairData.previous || [])
        .map(ch => ({ ...ch, timeAgo: getTimeAgo(ch.lastUsedAt) }))
        .filter((ch, index, arr) => arr.findIndex(item => item.timeAgo === ch.timeAgo) === index);

    uniquePrevious.forEach(ch => {
        if (ch.shareCode) list.push({ shareCode: ch.shareCode });
    });

    return list;
}

function resolveShareCodeForHistory(player, historyParam) {
    const currentShareCode = player.crosshairData?.current?.shareCode;
    if (typeof historyParam !== "string") return currentShareCode;

    const idx = parseInt(historyParam, 10);
    if (!Number.isInteger(idx) || idx < 0) return currentShareCode;

    const versions = buildVersionList(player);
    if (idx >= versions.length) return currentShareCode;

    return versions[idx].shareCode || currentShareCode;
}

function isDiscordUserAgent(userAgent) {
    return userAgent && (
        userAgent.includes("Discordbot") ||
        userAgent.includes("Twitterbot") ||
        userAgent.includes("facebookexternalhit") ||
        userAgent.includes("LinkedInBot")
    );
}

async function getCrosshairHandler(req, res, onlyCode = false) {
    const code = req.params.code || DEFAULT_CODE;
    const originalInput = code;

    if (!code) {
        return res.status(400).json({
            error: "crosshair code is required",
            usage: [
                `${config.domain}/{crosshair-code}`,
                `${config.domain}/{steamid64}`,
                `${config.domain}/id/{steamvanity}`,
                `${config.domain}/{leetifyvanity}`
            ]
        });
    }

    try {
        let player;

        try {
            player = await processUserInput(code);
        } catch (error) {
            console.error("[error] processing input:", config.nodeEnv === "development" ? error : error.message);

            let errorType = "unknown";
            if (error.message.includes("steam profile") && error.message.includes("not found")) {
                errorType = "steam profile not found";
            } else if (error.message.includes("crosshair not found")) {
                errorType = "crosshair not found in any DB";
            }

            console.error(`[error] ${originalInput}'s ${errorType}`);
            if (onlyCode && code === DEFAULT_CODE) {
                return res.type("text/plain").send(req.params.code.substring(3) + "'s " + errorType);
            }

            const html = generateHTML(null, null, "", errorType, originalInput, false);
            return res.set({
                "Content-Type": "text/html",
                "Cache-Control": "public, max-age=3600",
            }).send(html);
        }

        if (onlyCode && req.params.code) {
            return res.type("text/plain").send(player.crosshairData.current?.shareCode);
        }

        const userAgent = req.get("User-Agent") || "";
        const isBot = isDiscordUserAgent(userAgent);

        let settings = null;
        let imageUrl = "";

        if (isBot) {
            const targetShareCode = resolveShareCodeForHistory(player, req.query.history);
            settings = renderer.parseCode(targetShareCode);
            const sanitizedCode = sanitizeShareCodeForUrl(targetShareCode);
            const isClassic = parseInt(settings.cl_crosshairstyle) === 2;

            const imageParams = new URLSearchParams();
            if (typeof req.query.weapon === "string") imageParams.set("weapon", req.query.weapon);
            if (typeof req.query.aspect === "string") imageParams.set("aspect", req.query.aspect);
            const queryString = imageParams.toString();

            imageUrl = `https://${config.domain}/image/${sanitizedCode}${isClassic ? ".gif" : ".png"}${queryString ? "?" + queryString : ""}`;
        }

        const html = generateHTML(player, settings, imageUrl, "", originalInput, isBot);

        res.set({
            "Content-Type": "text/html",
            "Cache-Control": isBot ? "public, max-age=3600" : "no-cache",
        }).send(html);

    } catch (error) {
        console.error("[error] server error:", config.nodeEnv === "development" ? error : error.message);
        res.status(500).json({ error: "internal server error :(" });
    }
}

module.exports = {
    getCrosshairHandler
};
