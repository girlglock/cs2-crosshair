// @ts-ignore
const { createCanvas } = require('canvas');
const config = require('../config');

class CS2CrosshairRenderer {
    constructor() {
        this.DICTIONARY = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
        this.DICTIONARY_LENGTH = this.DICTIONARY.length;
        this.CODE_PATTERN = config.patterns.xcodePattern;

        this.defaultSettings = {
            cl_crosshairalpha: 255,
            cl_crosshaircolor: 5,
            cl_crosshaircolor_b: 50,
            cl_crosshaircolor_g: 250,
            cl_crosshaircolor_r: 50,
            cl_crosshairdot: false,
            cl_crosshairgap: -2,
            cl_crosshairsize: 2,
            cl_crosshairstyle: 4,
            cl_crosshairusealpha: true,
            cl_crosshairthickness: 1,
            cl_crosshair_drawoutline: true,
            cl_crosshair_outlinethickness: 1,
            cl_crosshair_dynamic_maxdist_splitratio: 0.35,
            cl_crosshair_dynamic_splitalpha_innermod: 1,
            cl_crosshair_dynamic_splitalpha_outermod: 0.5,
            cl_crosshair_dynamic_splitdist: 7,
            cl_crosshair_t: false,
            cl_fixedcrosshairgap: -2,
            cl_crosshairgap_useweaponvalue: false,
            cl_crosshair_recoil: false
        };
    }

    signedByte(x) {
        return (x ^ 0x80) - 0x80;
    }

    valueToPixels(value, pixelsPerUnit = 2) {
        const pixels = Math.round(value * pixelsPerUnit);
        return Math.max(1, pixels);
    }

    parseCode(code) {
        try {
            let cleanCode = code.trim();

            if (!cleanCode.startsWith('CSGO-')) {
                if (cleanCode.length === 25 && /^[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]+$/.test(cleanCode)) {
                    cleanCode = `CSGO-${cleanCode.slice(0, 5)}-${cleanCode.slice(5, 10)}-${cleanCode.slice(10, 15)}-${cleanCode.slice(15, 20)}-${cleanCode.slice(20)}`;
                }
            }

            if (!this.CODE_PATTERN.test(cleanCode)) {
                console.log('bad pattern, using default crosshair');
                return this.defaultSettings;
            }

            const chars = cleanCode.slice(5).replace(/-/g, '');

            let num = BigInt(0);
            for (const char of chars.split('').reverse()) {
                const index = this.DICTIONARY.indexOf(char);
                if (index === -1) {
                    throw new Error(`[error] invalid char: ${char}`);
                }
                num = num * BigInt(this.DICTIONARY_LENGTH) + BigInt(index);
            }

            const hexnum = num.toString(16).padStart(36, '0');
            const bytes = [];
            for (let i = 0; i < hexnum.length; i += 2) {
                bytes.push(parseInt(hexnum.slice(i, i + 2), 16));
            }

            const checksum = bytes[0];
            const calculatedChecksum = bytes.slice(1).reduce((sum, byte) => sum + byte, 0) % 256;

            if (checksum !== calculatedChecksum) {
                console.log('checksum failed, using default crosshair');
                return this.defaultSettings;
            }

            const settings = {
                cl_crosshairgap: this.signedByte(bytes[2]) / 10,
                cl_crosshair_outlinethickness: bytes[3] / 2,
                cl_crosshaircolor_r: bytes[4],
                cl_crosshaircolor_g: bytes[5],
                cl_crosshaircolor_b: bytes[6],
                cl_crosshairalpha: bytes[7],
                cl_crosshair_dynamic_splitdist: bytes[8] & 0x7f,
                cl_crosshair_recoil: ((bytes[8] >> 7) & 1) === 1,
                cl_fixedcrosshairgap: this.signedByte(bytes[9]) / 10,
                cl_crosshaircolor: bytes[10] & 7, // color index not actual rgbcolor 
                cl_crosshair_drawoutline: (bytes[10] & 8) === 8,
                cl_crosshair_dynamic_splitalpha_innermod: (bytes[10] >> 4) / 10,
                cl_crosshair_dynamic_splitalpha_outermod: (bytes[11] & 0xf) / 10,
                cl_crosshair_dynamic_maxdist_splitratio: (bytes[11] >> 4) / 10,
                cl_crosshairthickness: bytes[12] / 10,
                cl_crosshairstyle: (bytes[13] & 0xf) >> 1,
                cl_crosshairdot: ((bytes[13] >> 4) & 1) === 1,
                cl_crosshairgap_useweaponvalue: ((bytes[13] >> 5) & 1) === 1,
                cl_crosshairusealpha: ((bytes[13] >> 6) & 1) === 1,
                cl_crosshair_t: ((bytes[13] >> 7) & 1) === 1,
                cl_crosshairsize: (((bytes[15] & 0x1f) << 8) + bytes[14]) / 10
            };

            return settings;

        } catch (error) {
            console.error('[error] pawsing cwosshaiw code :( ', process.env.NODE_ENV === 'development' ? error : error.message);
            return this.defaultSettings;
        }
    }

    getColor(settings) {
        const colorIndex = settings.cl_crosshaircolor;

        if (colorIndex === 5) {
            return [settings.cl_crosshaircolor_r, settings.cl_crosshaircolor_g, settings.cl_crosshaircolor_b];
        }

        const presetColors = {
            0: [255, 0, 0],   // red
            1: [0, 255, 0],   // green
            2: [255, 255, 0], // yellow
            3: [0, 0, 255],   // blue
            4: [0, 255, 255]  // blu dog
        };

        return presetColors[colorIndex] || [0, 255, 0];
    }

    renderCrosshair(settings, canvasSize = 64) {
        const canvas = createCanvas(canvasSize, canvasSize);
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvasSize, canvasSize);

        const center = { x: canvasSize / 2, y: canvasSize / 2 };
        const [r, g, b] = this.getColor(settings);
        const alpha = settings.cl_crosshairusealpha ? settings.cl_crosshairalpha / 255 : 1;
        const style = parseInt(settings.cl_crosshairstyle);

        if (style < 2) {
            return canvas;
        }

        const crosshairLength = Math.floor(settings.cl_crosshairsize * 2);
        const crosshairWidth = Math.max(1, Math.floor(settings.cl_crosshairthickness * 2));
        const crosshairGap = Math.ceil(parseFloat(settings.cl_crosshairgap) + 4);

        const adjustedLength = parseInt(settings.cl_crosshairsize) > 2 ? crosshairLength + 1 : crosshairLength;

        const outlineThickness = settings.cl_crosshair_drawoutline ? settings.cl_crosshair_outlinethickness : 0;
        const crosshairColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        ctx.imageSmoothingEnabled = false;

        let translate = (crosshairWidth % 2) / 2;
        ctx.translate(translate, translate);

        if (settings.cl_crosshair_drawoutline && outlineThickness > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

            const strokeTranslate = (crosshairWidth / 2) - Math.floor(crosshairWidth / 2);
            ctx.translate(-translate, -translate);
            ctx.translate(strokeTranslate, strokeTranslate);

            ctx.fillRect(
                (center.x + ((crosshairWidth / 2) + crosshairGap)) - outlineThickness,
                (center.y - (crosshairWidth / 2)) - outlineThickness,
                adjustedLength + (outlineThickness * 2),
                crosshairWidth + (outlineThickness * 2)
            );

            ctx.fillRect(
                (center.x - ((adjustedLength + (crosshairWidth / 2)) + crosshairGap)) - outlineThickness,
                (center.y - (crosshairWidth / 2)) - outlineThickness,
                adjustedLength + (outlineThickness * 2),
                crosshairWidth + (outlineThickness * 2)
            );

            ctx.fillRect(
                (center.x - (crosshairWidth / 2)) - outlineThickness,
                (center.y + ((crosshairWidth / 2) + crosshairGap)) - outlineThickness,
                crosshairWidth + (outlineThickness * 2),
                adjustedLength + (outlineThickness * 2)
            );

            if (!settings.cl_crosshair_t) {
                ctx.fillRect(
                    (center.x - (crosshairWidth / 2)) - outlineThickness,
                    (center.y - ((adjustedLength + (crosshairWidth / 2) + crosshairGap))) - outlineThickness,
                    crosshairWidth + (outlineThickness * 2),
                    adjustedLength + (outlineThickness * 2)
                );
            }

            ctx.translate(-strokeTranslate, -strokeTranslate);
            ctx.translate(translate, translate);
        }

        // arms
        ctx.fillStyle = crosshairColor;

        // right arm
        ctx.fillRect(
            center.x + ((crosshairWidth / 2) + crosshairGap),
            center.y - (crosshairWidth / 2),
            adjustedLength,
            crosshairWidth
        );

        // left arm
        ctx.fillRect(
            center.x - ((adjustedLength + (crosshairWidth / 2)) + crosshairGap),
            center.y - (crosshairWidth / 2),
            adjustedLength,
            crosshairWidth
        );

        // bottom arm
        ctx.fillRect(
            center.x - (crosshairWidth / 2),
            center.y + ((crosshairWidth / 2) + crosshairGap),
            crosshairWidth,
            adjustedLength
        );

        // top arm
        if (!settings.cl_crosshair_t) {
            ctx.fillRect(
                center.x - (crosshairWidth / 2),
                center.y - ((adjustedLength + (crosshairWidth / 2)) + crosshairGap),
                crosshairWidth,
                adjustedLength
            );
        }

        if (settings.cl_crosshairdot) {
            const dotWidth = crosshairWidth;
            const dotHeight = crosshairWidth;

            if (settings.cl_crosshair_drawoutline && outlineThickness > 0) {
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

                const strokeTranslate = (crosshairWidth / 2) - Math.floor(crosshairWidth / 2);
                ctx.translate(-translate, -translate);
                ctx.translate(strokeTranslate, strokeTranslate);

                ctx.fillRect(
                    (center.x - (crosshairWidth / 2)) - outlineThickness,
                    (center.y - (crosshairWidth / 2)) - outlineThickness,
                    crosshairWidth + (outlineThickness * 2),
                    crosshairWidth + (outlineThickness * 2)
                );

                ctx.translate(-strokeTranslate, -strokeTranslate);
                ctx.translate(translate, translate);
            }

            ctx.fillStyle = crosshairColor;
            ctx.fillRect(
                center.x - (dotWidth / 2),
                center.y - (dotHeight / 2),
                dotWidth,
                dotHeight
            );
        }

        ctx.translate(-translate, -translate);

        return canvas;
    }

    drawRect(ctx, x, y, width, height) {
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    }
}

module.exports = { CS2CrosshairRenderer };