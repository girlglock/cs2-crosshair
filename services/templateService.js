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
    const profileUrl = isLeetify
        ? `https://leetify.com/@${crosshairData.nickname}`
        : `https://steamcommunity.com/profiles/${crosshairData.steamId64}`;

    const iconUrl = isLeetify
        ? 'https://leetify.com/assets/images/favicon.svg'
        : 'https://steamcommunity.com/favicon.ico';

    const playerInfo = crosshairData.nickname
        ? `<a href="${profileUrl}" style="text-decoration: none; color: rgb(${r}, ${g}, ${b}); display: inline-flex; align-items: center;">
        <img src="${iconUrl}" style="width: 14px; height: 14px; margin-right: 6px;">
        ${crosshairData.nickname}${crosshairData.cs2Hours ? ` • ${crosshairData.cs2Hours}` : ''}</a>`
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