const fs = require('fs');
const path = require('path');
const config = require('../config');
const { CS2CrosshairRenderer } = require('./crosshairRenderer');
const { getCrosshairData } = require('./playerService');
const { generateHTML } = require('./templateService');
const { getCachedEntry, setCachedEntry } = require('./cacheService');

const CACHE_DIR = config.cache.directory;
const renderer = new CS2CrosshairRenderer();

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function processUserInput(input) {
    const cacheIdentifier = (input.endsWith('/') ? input.slice(0, -1) : input).replace(/^profiles\//, '');

    if (input.startsWith("CSGO-")) {
        return {
            crosshairData: {
                current: {
                    shareCode: input
                },
            },
            nickname: '',
            cs2Hours: '',
            playerType: 'code'
        };
    }

    const cachedCrosshair = getCachedEntry(cacheIdentifier);
    if (cachedCrosshair) {
        return cachedCrosshair;
    }

    let steamID64, username, playerType;

    if (input.startsWith("id/")) {
        username = `id/${input.substring(3)}`;
        playerType = 'steam_vanity';
    } else if (config.patterns.steamID64Pattern.test(input)) {
        steamID64 = input;
        username = `profiles/${steamID64}`;
        playerType = 'steam_id';
    } else if (input.startsWith("profiles/") && config.patterns.steamID64Pattern.test(input.substring(9))) {
        username = input.substring(9);
        playerType = 'steam_profile';
    } else if (!config.patterns.steamID64Pattern.test(input)) {
        username = input.split(/[/\s]/)[0];
        playerType = 'leetify';
    }

    try {
        const result = await getCrosshairData(username, playerType);

        if (!result.crosshairData.current.shareCode) {
            throw new Error(`crosshair not found for ${username}`);
        }

        setCachedEntry(cacheIdentifier, result);
        return result;

    } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error('[error] processing user input:', error.message);
        throw error;
    }
}

async function getCrosshairHandler(req, res, onlyCode = false) {
    const code = req.params.code || "CSGO-PfaBQ-tbEjf-aeQtY-fF6hh-kESyL"; //get some default code
    const originalInput = code;

    if (!code) {
        return res.status(400).json({
            error: 'crosshair code is required',
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
            console.error('[error] processing input:', process.env.NODE_ENV === 'development' ? error : error.message);

            let errorType = 'unknown';
            if (error.message.includes('steam profile') && error.message.includes('not found')) {
                errorType = 'steam profile not found';
            } else if (error.message.includes('crosshair not found')) {
                errorType = 'crosshair not found in any DB';
            }

            console.error(`[error] ${originalInput}'s ${errorType}`);
            if (onlyCode && code === "CSGO-PfaBQ-tbEjf-aeQtY-fF6hh-kESyL") {
                return res.type('text/plain').send(req.params.code.substring(3) + "'s " + errorType);
            }

            const html = generateHTML(null, null, '', errorType, originalInput, false);
            return res.set({
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=3600',
            }).send(html);
        }

        if (onlyCode && req.params.code) {
            return res.type('text/plain').send(player.crosshairData.current?.shareCode);
        }

        const settings = renderer.parseCode(player.crosshairData.current?.shareCode);

        let sanitizedCrosshairCode = player.crosshairData.current?.shareCode;
        sanitizedCrosshairCode = sanitizedCrosshairCode.split('/')[0];
        sanitizedCrosshairCode = sanitizedCrosshairCode.replace(/[\\:*?"<>|]/g, '');

        const cacheFile = path.join(CACHE_DIR, `${sanitizedCrosshairCode}.png`);

        let imageBuffer;
        if (fs.existsSync(cacheFile)) {
            imageBuffer = fs.readFileSync(cacheFile);
        } else {
            const canvas = renderer.renderCrosshair(settings, config.crosshair.canvasSize);
            imageBuffer = canvas.toBuffer('image/png');
            fs.writeFileSync(cacheFile, imageBuffer);
        }

        //for embed bots
        const userAgent = req.get('User-Agent') || '';
        const isBot = isDiscordUserAgent(userAgent);
        let imageUrl;
        if (isBot) {
            imageUrl = `https://${config.domain}/image/${sanitizedCrosshairCode}`;
        } else if (code === "CSGO-PfaBQ-tbEjf-aeQtY-fF6hh-kESyL" && isBot) {
            imageUrl = `https://raw.githubusercontent.com/girlglock/cs2-crosshair/refs/heads/main/remote-assets/default-embed.png`;
        }
        else {
            imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        }

        const html = generateHTML(player, settings, imageUrl, '', originalInput, isBot);

        res.set({
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600',
        }).send(html);

    } catch (error) {
        console.error('[error] server error:', process.env.NODE_ENV === 'development' ? error : error.message);
        res.status(500).json({ error: 'internal server error :(' });
    }
}

function isDiscordUserAgent(userAgent) {
    return userAgent && (
        userAgent.includes('Discordbot') ||
        userAgent.includes('Twitterbot') ||
        userAgent.includes('facebookexternalhit') ||
        userAgent.includes('LinkedInBot')
    );
}

module.exports = {
    getCrosshairHandler
};