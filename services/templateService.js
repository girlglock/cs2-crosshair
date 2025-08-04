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

    return presetColors[colorIndex] || [0, 255, 0];
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
        ? 'crosshair code preview :3' 
        : `${crosshairData.nickname}'s crosshair`;

    const playerInfo = crosshairData.nickname && crosshairData.cs2Hours 
        ? `${crosshairData.nickname} • ${crosshairData.cs2Hours} \n`
        : crosshairData.nickname + "\n" || '';

    const templateName = isBot ? 'discord-embed' : 'crosshair-preview';

    return renderTemplate(templateName, {
        title,
        playerInfo,
        codeValue: crosshairData.crosshairCode,
        originalInput,
        imageUrl,
        themeColor,
        colorRGB: `rgb(${r}, ${g}, ${b})`,
        domain: config.domain
    });
}

module.exports = { generateHTML };