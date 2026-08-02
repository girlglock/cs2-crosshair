(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        const data = factory();
        root.WEAPON_PRESETS = data.WEAPON_PRESETS;
        root.ASPECT_RATIO_PRESETS = data.ASPECT_RATIO_PRESETS;
    }
})(typeof window !== "undefined" ? window : globalThis, function () {
    const WEAPON_PRESETS = [
        { category: "Melee", name: "Knife", moveInaccuracy: 0, standInaccuracy: 0, deployedGap: 2, maxSpeed: 250 },
        { category: "Pistols", name: "Glock-18", moveInaccuracy: 0.0120, standInaccuracy: 0.00560, deployedGap: 2, maxSpeed: 240 },
        { category: "Pistols", name: "USP-S", moveInaccuracy: 0.0139, standInaccuracy: 0.00490, deployedGap: 2, maxSpeed: 240 },
        { category: "Pistols", name: "P2000", moveInaccuracy: 0.0130, standInaccuracy: 0.00490, deployedGap: 2, maxSpeed: 240 },
        { category: "Pistols", name: "P250", moveInaccuracy: 0.0134, standInaccuracy: 0.00910, deployedGap: 2, maxSpeed: 240 },
        { category: "Pistols", name: "Five-SeveN", moveInaccuracy: 0.0134, standInaccuracy: 0.00910, deployedGap: 2, maxSpeed: 240 },
        { category: "Pistols", name: "Tec-9", moveInaccuracy: 0.0038, standInaccuracy: 0.00943, deployedGap: 3, maxSpeed: 240 },
        { category: "Pistols", name: "CZ75-Auto", moveInaccuracy: 0.0134, standInaccuracy: 0.01043, deployedGap: 3, maxSpeed: 240 },
        { category: "Pistols", name: "Dual Berettas", moveInaccuracy: 0.0179, standInaccuracy: 0.00700, deployedGap: 3, maxSpeed: 240 },
        { category: "Pistols", name: "Desert Eagle", moveInaccuracy: 0.0481, standInaccuracy: 0.00420, deployedGap: 3, maxSpeed: 230 },
        { category: "Pistols", name: "R8 Revolver", moveInaccuracy: 0.0065, standInaccuracy: 0.00200, deployedGap: 3, maxSpeed: 180 },
        { category: "SMGs", name: "MAC-10", moveInaccuracy: 0.0140, standInaccuracy: 0.01330, deployedGap: 3, maxSpeed: 240 },
        { category: "SMGs", name: "MP9", moveInaccuracy: 0.0290, standInaccuracy: 0.00900, deployedGap: 3, maxSpeed: 240 },
        { category: "SMGs", name: "MP7", moveInaccuracy: 0.0199, standInaccuracy: 0.01000, deployedGap: 3, maxSpeed: 220 },
        { category: "SMGs", name: "MP5-SD", moveInaccuracy: 0.011, standInaccuracy: 0.005, deployedGap: 3, maxSpeed: 235 },
        { category: "SMGs", name: "UMP-45", moveInaccuracy: 0.0288, standInaccuracy: 0.01343, deployedGap: 3, maxSpeed: 230 },
        { category: "SMGs", name: "P90", moveInaccuracy: 0.0310, standInaccuracy: 0.01365, deployedGap: 3, maxSpeed: 230 },
        { category: "SMGs", name: "PP-Bizon", moveInaccuracy: 0.0276, standInaccuracy: 0.01400, deployedGap: 3, maxSpeed: 240 },
        { category: "Rifles", name: "Galil AR", moveInaccuracy: 0.1236, standInaccuracy: 0.00877, deployedGap: 4, maxSpeed: 215 },
        { category: "Rifles", name: "FAMAS", moveInaccuracy: 0.0993, standInaccuracy: 0.00985, deployedGap: 4, maxSpeed: 220 },
        { category: "Rifles", name: "AK-47", moveInaccuracy: 0.1751, standInaccuracy: 0.00641, deployedGap: 5, maxSpeed: 215 },
        { category: "Rifles", name: "M4A4", moveInaccuracy: 0.1379, standInaccuracy: 0.00490, deployedGap: 4, maxSpeed: 225 },
        { category: "Rifles", name: "M4A1-S", moveInaccuracy: 0.0929, standInaccuracy: 0.00490, deployedGap: 4, maxSpeed: 225 },
        { category: "Rifles", name: "SG 553", moveInaccuracy: 0.1360, standInaccuracy: 0.00378, deployedGap: 4, maxSpeed: 210 },
        { category: "Rifles", name: "AUG", moveInaccuracy: 0.1354, standInaccuracy: 0.00385, deployedGap: 4, maxSpeed: 220 },
        { category: "Heavy", name: "Nova", moveInaccuracy: 0.0367, standInaccuracy: 0.00700, deployedGap: 4, maxSpeed: 220 },
        { category: "Heavy", name: "XM1014", moveInaccuracy: 0.0360, standInaccuracy: 0.00700, deployedGap: 4, maxSpeed: 215 },
        { category: "Heavy", name: "Sawed-Off", moveInaccuracy: 0.0168, standInaccuracy: 0.00700, deployedGap: 4, maxSpeed: 210 },
        { category: "Heavy", name: "MAG-7", moveInaccuracy: 0.0160, standInaccuracy: 0.00700, deployedGap: 4, maxSpeed: 225 },
        { category: "Heavy", name: "M249", moveInaccuracy: 0.1563, standInaccuracy: 0.00770, deployedGap: 5, maxSpeed: 195 },
        { category: "Heavy", name: "Negev", moveInaccuracy: 0.1591, standInaccuracy: 0.01017, deployedGap: 5, maxSpeed: 195 }
    ];

    const ASPECT_RATIO_PRESETS = [
        { label: "4:3", ratio: 4 / 3 },
        { label: "5:4", ratio: 5 / 4 },
        { label: "16:10", ratio: 16 / 10 },
        { label: "16:9", ratio: 16 / 9 },
        { label: "21:9", ratio: 21 / 9 },
        { label: "32:9", ratio: 32 / 9 }
    ];

    return { WEAPON_PRESETS, ASPECT_RATIO_PRESETS };
});
