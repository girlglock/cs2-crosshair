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

function generateHTML(crosshairData, settings, imageUrl, errorType = '', originalInput = '', isBot = false) {
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

    const title = crosshairData.crosshairCode === originalInput
        ? 'cs2-crosshair-viewer'
        : `${crosshairData.nickname}'s crosshair`;

    const playerEmbedInfo = crosshairData.nickname && crosshairData.cs2Hours
        ? `${crosshairData.nickname} • ${crosshairData.cs2Hours} \n`
        : crosshairData.nickname + "\n" || '';

    const isLeetify = !crosshairData.steamId64;

    const leetifyLink = isLeetify
        ? `https://leetify.com/@${crosshairData.nickname}`
        : `https://leetify.com/public/profile/${crosshairData.steamId64}`;
    const steamLink = `https://steamcommunity.com/profiles/${crosshairData.steamId64}`;
    const csstatsLink = `https://csstats.gg/player/${crosshairData.steamId64}`;

    const iconStyle = 'width: 14px; height: 14px; margin-right: 1px; margin-top: 8px; filter: brightness(0) saturate(100%) invert(100%);';

    const leetifyIcon = `<a href="${leetifyLink}" target="_blank" style="margin-right: 1px;">
    <img src="https://leetify.com/assets/images/favicon.svg" style="${iconStyle}"></a>`;

    const steamIcon = !isLeetify
        ? `<a href="${steamLink}" target="_blank" style="margin-right: 1px;">
        <img src="https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/logos/steam-7tmhpbwzco485ew3p66mh.png/steam-ghlhjssxznri21c5tax15n.png" style="${iconStyle}"></a>`
        : '';

    const csstatsIcon = !isLeetify
        ? `<a href="${csstatsLink}" target="_blank">
        <img src="https://static.csstats.gg/images/favicon.svg" style="${iconStyle}"></a>`
        : '';

    const playerInfo = crosshairData.nickname
        ? `<span style="text-decoration: none; color: rgb(${r}, ${g}, ${b}); display: inline-flex; align-items: center;">
        ${csstatsIcon}${leetifyIcon}${steamIcon}
        <span style="margin-left: 1px;"> • ${crosshairData.nickname}${crosshairData.cs2Hours ? ` • ${crosshairData.cs2Hours}` : ''}</span></span>`
        : '';


    const templateName = isBot ? 'discord-embed' : 'crosshair-preview';

    return renderTemplate(templateName, {
        title,
        playerEmbedInfo,
        playerInfo,
        codeValue: isBot && crosshairData.crosshairCode === "CSGO-PfaBQ-tbEjf-aeQtY-fF6hh-kESyL" ? 'search and view cs2 player crosshairs' : crosshairData.crosshairCode,
        originalInput,
        imageUrl,
        themeColor,
        colorRGB: `rgb(${r}, ${g}, ${b})`,
        domain: config.domain
    });
}

module.exports = { generateHTML };