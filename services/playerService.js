const xml2js = require('xml2js');
const config = require('../config');

async function getLeetifyCrosshair(playerQuery, isSteamId64) {
    const url = `https://api.cs-prod.leetify.com/api/profile/${isSteamId64 ? 'id/' + playerQuery : 'vanity-url/' + playerQuery}/crosshair`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.current?.shareCode || null;
        
    } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error(`[error] failed to get crosshair for ${url}:`, error);
        return null;
    }
}

async function fetchSteamProfile(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const xmlText = await response.text();
        const parser = new xml2js.Parser({ explicitArray: false });
        const xmlData = await parser.parseStringPromise(xmlText);

        const profile = xmlData?.profile || {};
        const nickname = profile.steamID?.trim() || "";
        const steamId64 = profile.steamID64?.trim() || "";

        let cs2Hours = "";
        const games = profile.mostPlayedGames?.mostPlayedGame;
        const gamesList = Array.isArray(games) ? games : games ? [games] : [];

        for (const game of gamesList) {
            if (game.gameName?.trim() === "Counter-Strike 2") {
                const rawHours = game.hoursOnRecord?.trim().replace(/,/g, "");
                const hours = parseFloat(rawHours);
                if (!isNaN(hours)) {
                    cs2Hours = `${Math.round(hours)}h`;
                }
                break;
            }
        }

        return { cs2Hours, nickname, steamId64 };
    } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error("[error] fetching Steam profile:", error);
        return null;
    }
}

async function getCrosshairData(username, playerType) {
    let steamId64, nickname = '', cs2Hours = '';

    try {
        switch (playerType) {
            case 'steam_vanity':
                const vanityId = username.substring(3);
                const vanityUrl = `https://steamcommunity.com/id/${vanityId}/?xml=1`;
                const vanityProfile = await fetchSteamProfile(vanityUrl);
                
                if (!vanityProfile || !vanityProfile.nickname) {
                    throw new Error(`steam profile (/id) ${vanityId} not found`);
                }
                
                steamId64 = vanityProfile.steamId64;
                nickname = vanityProfile.nickname;
                cs2Hours = vanityProfile.cs2Hours;
                break;

            case 'steam_id':
            case 'steam_profile':
                steamId64 = username.replace('profiles/', '');
                const profileUrl = `https://steamcommunity.com/profiles/${steamId64}/?xml=1`;
                const profile = await fetchSteamProfile(profileUrl);
                
                if (!profile || !profile.nickname) {
                    throw new Error(`steam profile (/profiles) ${steamId64} not found`);
                }
                
                nickname = profile.nickname;
                cs2Hours = profile.cs2Hours;
                break;

            case 'leetify':
                // TODO: get steamid64 from leetify and use to fetch steam profile stuff
                nickname = username;
                break;

            default:
                throw new Error(`unknown player type: ${playerType}`);
        }

        let crosshairCode;
        if (playerType !== 'code') {
            const lookupId = steamId64 || username;
            crosshairCode = await getLeetifyCrosshair(lookupId, config.patterns.steamID64Pattern.test(lookupId));
            
            if (!crosshairCode) {
                throw new Error(`crosshair not found for ${lookupId}`);
            }
        }

        return {
            crosshairCode,
            nickname,
            cs2Hours,
            playerType,
            steamId64
        };

    } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error('[error] getting crosshair data:', error);
        throw error;
    }
}

module.exports = { 
    getCrosshairData,
    getLeetifyCrosshair 
};