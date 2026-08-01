const config = require("./config");
const { CS2CrosshairRenderer } = require("../public/static/crosshairRenderer");
const { getCrosshairData } = require("./playerService");
const { generateHTML } = require("./templateService");
const { getCachedEntry, setCachedEntry } = require("./cache");

const DEFAULT_CODE = "CSGO-PfaBQ-tbEjf-aeQtY-fF6hh-kESyL";
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
            settings = renderer.parseCode(player.crosshairData.current?.shareCode);
            const sanitizedCode = sanitizeShareCodeForUrl(player.crosshairData.current?.shareCode);
            const isClassic = parseInt(settings.cl_crosshairstyle) === 2;
            imageUrl = `https://${config.domain}/image/${sanitizedCode}${isClassic ? ".gif" : ".png"}`;
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
