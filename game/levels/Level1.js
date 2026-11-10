const groundY = 460;
const worldWidth = 3600;

const platforms = [
    // Leave a 110-pixel pit between x = 820 and x = 930.
    { x: 0, y: groundY, width: 820, height: 80 },
    { x: 930, y: groundY, width: worldWidth - 930, height: 80 },

    // Opening: wide platforms and gentle climbs.
    { x: 220, y: 375, width: 170, height: 24 },
    { x: 440, y: 305, width: 160, height: 24 },
    { x: 650, y: 235, width: 150, height: 24 },

    // Middle: alternating heights and smaller landings.
    { x: 950, y: 380, width: 145, height: 24 },
    { x: 1155, y: 305, width: 120, height: 24 },
    { x: 1355, y: 335, width: 120, height: 24 },
    { x: 1545, y: 250, width: 125, height: 24 },

    // Upper route: more space between platforms.
    { x: 1810, y: 380, width: 130, height: 24 },
    { x: 2015, y: 300, width: 110, height: 24 },
    { x: 2205, y: 220, width: 110, height: 24 },
    { x: 2410, y: 255, width: 120, height: 24 },

    // Final climb: narrower steps leading to the flag.
    { x: 2660, y: 375, width: 120, height: 24 },
    { x: 2860, y: 290, width: 110, height: 24 },
    { x: 3050, y: 205, width: 100, height: 24 },
    { x: 3230, y: 135, width: 150, height: 24 }
];

// Level geometry and starting positions. Runtime state lives in game.js.
export const level1 = {
    id: 1,
    name: "The First Steps",
    groundY,
    worldWidth,
    platforms,
    spawn: { x: 80, feetY: groundY },
    creature: { startX: 1100, minX: 1040, maxX: 1200, width: 32, height: 24, speed: 70 },
    finish: { platform: platforms[platforms.length - 1], flagInset: 40 }
};
