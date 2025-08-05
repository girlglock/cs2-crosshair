class CS2CrosshairRenderer {
    constructor() {
        this.DICTIONARY = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
        this.DICTIONARY_LENGTH = this.DICTIONARY.length;

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

    parseCode(code) {
        try {
            let cleanCode = code.trim();

            if (!cleanCode.startsWith('CSGO-')) {
                if (cleanCode.length === 25 && /^[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]+$/.test(cleanCode)) {
                    cleanCode = `CSGO-${cleanCode.slice(0, 5)}-${cleanCode.slice(5, 10)}-${cleanCode.slice(10, 15)}-${cleanCode.slice(15, 20)}-${cleanCode.slice(20)}`;
                }
            }

            const codePattern = /^CSGO(-[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]{5}){5}$/;
            if (!codePattern.test(cleanCode)) {
                console.log('bad pattern, using default crosshair');
                return this.defaultSettings;
            }

            const chars = cleanCode.slice(5).replace(/-/g, '');

            let num = BigInt(0);
            for (const char of chars.split('').reverse()) {
                const index = this.DICTIONARY.indexOf(char);
                if (index === -1) {
                    throw new Error(`invalid char: ${char}`);
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
                cl_crosshaircolor: bytes[10] & 7,
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
            console.error('parsing crosshair code error:', error);
            return this.defaultSettings;
        }
    }

    generateCode(settings) {
        try {
            const bytes = new Array(18).fill(0);
            bytes[2] = Math.round((settings.cl_crosshairgap * 10) + 128) & 0xff;
            bytes[3] = Math.round(settings.cl_crosshair_outlinethickness * 2);
            bytes[4] = Math.round(settings.cl_crosshaircolor_r);
            bytes[5] = Math.round(settings.cl_crosshaircolor_g);
            bytes[6] = Math.round(settings.cl_crosshaircolor_b);
            bytes[7] = Math.round(settings.cl_crosshairalpha);
            bytes[8] = (Math.round(settings.cl_crosshair_dynamic_splitdist) & 0x7f) | (settings.cl_crosshair_recoil ? 0x80 : 0);
            bytes[9] = Math.round((settings.cl_fixedcrosshairgap * 10) + 128) & 0xff;
            bytes[10] = (Math.round(settings.cl_crosshaircolor) & 7) | (settings.cl_crosshair_drawoutline ? 8 : 0) | ((Math.round(settings.cl_crosshair_dynamic_splitalpha_innermod * 10) & 0xf) << 4);
            bytes[11] = (Math.round(settings.cl_crosshair_dynamic_splitalpha_outermod * 10) & 0xf) | ((Math.round(settings.cl_crosshair_dynamic_maxdist_splitratio * 10) & 0xf) << 4);
            bytes[12] = Math.round(settings.cl_crosshairthickness * 10);

            const sizeValue = Math.round(settings.cl_crosshairsize * 10);
            bytes[14] = sizeValue & 0xff;
            bytes[15] = (sizeValue >> 8) & 0x1f;

            bytes[13] = ((Math.round(settings.cl_crosshairstyle) & 7) << 1) |
                (settings.cl_crosshairdot ? 0x10 : 0) |
                (settings.cl_crosshairgap_useweaponvalue ? 0x20 : 0) |
                (settings.cl_crosshairusealpha ? 0x40 : 0) |
                (settings.cl_crosshair_t ? 0x80 : 0);

            const checksum = bytes.slice(1).reduce((sum, byte) => sum + byte, 0) % 256;
            bytes[0] = checksum;

            const hexString = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
            let num = BigInt('0x' + hexString);

            let result = '';
            while (num > 0) {
                result = this.DICTIONARY[Number(num % BigInt(this.DICTIONARY_LENGTH))] + result;
                num = num / BigInt(this.DICTIONARY_LENGTH);
            }

            result = result.padStart(25, this.DICTIONARY[0]);
            return `CSGO-${result.slice(0, 5)}-${result.slice(5, 10)}-${result.slice(10, 15)}-${result.slice(15, 20)}-${result.slice(20)}`;

        } catch (error) {
            console.error('generating crosshair code error:', error);
            return 'CSGO-ERROR-ERROR-ERROR-ERROR-ERROR';
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
            4: [0, 255, 255]  // cyan
        };

        return presetColors[colorIndex] || [0, 255, 0];
    }

    renderCrosshair(settings, canvasSize = 64) {
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvasSize, canvasSize);

        const center = { x: canvasSize / 2, y: canvasSize / 2 };
        const [r, g, b] = this.getColor(settings);
        const alpha = settings.cl_crosshairusealpha ? settings.cl_crosshairalpha / 255 : 1;
        const style = parseInt(settings.cl_crosshairstyle);

        if (style !== 2 && style !== 4) {
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

        ctx.fillStyle = crosshairColor;

        ctx.fillRect(
            center.x + ((crosshairWidth / 2) + crosshairGap),
            center.y - (crosshairWidth / 2),
            adjustedLength,
            crosshairWidth
        );

        ctx.fillRect(
            center.x - ((adjustedLength + (crosshairWidth / 2)) + crosshairGap),
            center.y - (crosshairWidth / 2),
            adjustedLength,
            crosshairWidth
        );

        ctx.fillRect(
            center.x - (crosshairWidth / 2),
            center.y + ((crosshairWidth / 2) + crosshairGap),
            crosshairWidth,
            adjustedLength
        );

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
}