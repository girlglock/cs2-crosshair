const fs = require('fs');
const path = require('path');
const config = require('../config');

const templateCache = new Map();

function loadTemplate(templateName) {
    if (templateCache.has(templateName)) {
        return templateCache.get(templateName);
    }

    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);

    try {
        const template = fs.readFileSync(templatePath, 'utf8');
        templateCache.set(templateName, template);
        return template;
    } catch (error) {
        console.error(`[error] loading template ${templateName}:`, process.env.NODE_ENV === 'development' ? error : error.message);
        return null;
    }
}

function renderTemplate(templateName, variables = {}) {
    const template = loadTemplate(templateName);
    if (!template) {
        return null;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
}

function getColorFromSettings(settings) {
    const colorIndex = settings.cl_crosshaircolor;

    if (colorIndex === 5) {
        return [settings.cl_crosshaircolor_r, settings.cl_crosshaircolor_g, settings.cl_crosshaircolor_b];
    }

    const presetColors = {
        0: [255, 0, 0],   // red
        1: [0, 255, 0],   // green
        2: [255, 255, 0], // yellow
        3: [0, 0, 255],   // blue
        4: [0, 255, 255]  // cyan
    };

    return presetColors[colorIndex] || [160, 255, 255];
}

function getTimeAgo(dateString, forceDays = false) {
    if (!dateString) return '';

    try {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (forceDays && diffDays >= 1) {
            return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        }

        if (diffSeconds < 60) {
            return diffSeconds <= 1 ? 'just now' : `${diffSeconds} seconds ago`;
        } else if (diffMinutes < 60) {
            return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays < 30) {
            return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        } else if (diffMonths < 12) {
            return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
        } else {
            return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
        }
    } catch (error) {
        console.error('Error parsing date:', error);
        return '';
    }
}

function generateHTML(player, settings, imageUrl, errorType = '', originalInput = '', isBot = false) {
    if (errorType !== '') {
        return renderTemplate('error', {
            originalInput,
            errorType,
            domain: config.domain,
            usageExamples: [
                `${config.domain}/CSGO-VHcPj-yPL6x-NAHqX-s2yyW-o2OtQ`,
                `${config.domain}/76561198123456789`,
                `${config.domain}/profiles/76561198123456789`,
                `${config.domain}/id/some_steam_vanity`,
                `${config.domain}/some_leetify_vanity`
            ].join('<br>• ')
        });
    }

    const [r, g, b] = settings ? getColorFromSettings(settings) : [0, 255, 0];
    const themeColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    const title = player.crosshairData.current?.shareCode === originalInput
        ? 'cs2-crosshair-viewer'
        : `${player.nickname}'s crosshair`;

    const playerEmbedInfo = player.nickname && player.cs2Hours
        ? `${player.nickname} • ${player.cs2Hours} \n`
        : (player.nickname + "\n") || '';

    const isLeetify = !player.steamId64;
    const iconStyle = 'width: 14px; height: 14px; margin-right: 1px; margin-top: 8px; filter: brightness(0) saturate(100%) invert(100%);';

    const links = {
        leetify: `<a href="${isLeetify ? `https://leetify.com/@${player.nickname}` : `https://leetify.com/public/profile/${player.steamId64}`}" target="_blank" style="margin-right: 1px;"><img src="https://leetify.com/assets/images/favicon.svg" style="${iconStyle}"></a>`,
        steam: !isLeetify ? `<a href="https://steamcommunity.com/profiles/${player.steamId64}" target="_blank" style="margin-right: 1px;"><img src="https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/logos/steam-7tmhpbwzco485ew3p66mh.png/steam-ghlhjssxznri21c5tax15n.png" style="${iconStyle}"></a>` : '',
        csstats: !isLeetify ? `<a href="https://csstats.gg/player/${player.steamId64}" target="_blank"><img src="https://static.csstats.gg/images/favicon.svg" style="${iconStyle}"></a>` : ''
    };

    const playerInfo = player.nickname
        ? `<span style="text-decoration: none; color: rgb(${r}, ${g}, ${b}); display: inline-flex; align-items: center;">
            ${links.csstats}${links.leetify}${links.steam}
            <span style="margin-left: 1px;"> • ${player.nickname}${player.cs2Hours ? ` • ${player.cs2Hours}` : ''}</span>
           </span>`
        : '';

    const formatStats = (stats) => {
        if (!stats) return '';

        const statIconStyle = 'width: 12px; height: 12px; margin-right: 2px; filter: brightness(0) saturate(100%) invert(100%);';
        const matchCount = stats.wins + stats.losses;

        return `<div style="font-size: 0.8em;">${player.nickname}'s stats with this crosshair:</div>` +
        `<span title="Games Played">${matchCount} Match${matchCount === 1 ? '' : 'es'}</span> • ` +
        `<img src="https://raw.githubusercontent.com/girlglock/cs2-crosshair/refs/heads/main/remote-assets/static/icons/wr-icon.png" style="${statIconStyle}"> ${(stats.winRate * 100).toFixed(0)}% • ` + `<span title="K/D Ratio">K/D ${stats.kdRatio}</span> • ` +
        `<span title="Average Damage per Round">ADR ${stats.adr}</span> • ` +
        `<img src="https://raw.githubusercontent.com/girlglock/cs2-crosshair/refs/heads/main/remote-assets/static/icons/hs-icon.png" style="${statIconStyle}"> ${(stats. headshotPercentage * 100).toFixed(0)}%`;
    };

    const formatPrevious = (previous) => {
        if (!previous || previous.length === 0) return '';

        const uniquePrevious = previous
            .map(ch => ({ ...ch, timeAgo: getTimeAgo(ch.lastUsedAt, true) }))
            .filter((ch, index, arr) => arr.findIndex(item => item.timeAgo === ch.timeAgo) === index);

        return `<br>Previous: ${uniquePrevious.map(ch =>
            `<a href="https://${config.domain}/${ch.shareCode}" style="color: inherit; text-decoration: underline;" title="${ch.timeAgo}">${ch.timeAgo}</a>`
        ).join(' • ')}`;
    };

    const templateName = isBot ? 'discord-embed' : 'crosshair-preview';

    return renderTemplate(templateName, {
        title,
        playerEmbedInfo,
        playerInfo,
        codeValue: isBot && player.crosshairData.current?.shareCode === "CSGO-PfaBQ-tbEjf-aeQtY-fF6hh-kESyL"
            ? 'search and view cs2 player crosshairs'
            : player.crosshairData.current?.shareCode,
        lastUsed: player.crosshairData.current?.lastUsedAt
            ? `Last used: ${getTimeAgo(player.crosshairData.current.lastUsedAt)}${formatPrevious(player.crosshairData.previous)}`
            : '',
        stats: formatStats(player.crosshairData.current?.stats),
        originalInput,
        imageUrl,
        themeColor,
        colorRGB: `rgb(${r}, ${g}, ${b})`,
        domain: config.domain
    });
}

module.exports = { generateHTML };