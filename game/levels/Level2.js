const groundY = 460;
const worldWidth = 4400;

// Three pits increase from 130 to 170 pixels; raised routes offer alternatives.
const platforms = [
    { x: 0, y: groundY, width: 700, height: 80 },
    { x: 830, y: groundY, width: 850, height: 80 },
    { x: 1840, y: groundY, width: 980, height: 80 },
    { x: 2990, y: groundY, width: worldWidth - 2990, height: 80 },

    { x: 200, y: 375, width: 140, height: 24 },
    { x: 410, y: 295, width: 130, height: 24 },
    { x: 610, y: 225, width: 120, height: 24 },

    { x: 880, y: 375, width: 140, height: 24 },
    { x: 1080, y: 295, width: 120, height: 24 },
    { x: 1280, y: 220, width: 120, height: 24 },
    { x: 1480, y: 300, width: 120, height: 24 },
    { x: 1700, y: 360, width: 160, height: 24 },

    { x: 1940, y: 375, width: 130, height: 24 },
    { x: 2140, y: 290, width: 120, height: 24 },
    { x: 2330, y: 210, width: 110, height: 24 },
    { x: 2540, y: 280, width: 120, height: 24 },
    { x: 2770, y: 330, width: 120, height: 24 },

    { x: 3010, y: 375, width: 150, height: 24 },
    { x: 3210, y: 295, width: 120, height: 24 },

    // The final staircase is reachable with the unchanged jump strength.
    { x: 3420, y: 375, width: 140, height: 24 },
    { x: 3630, y: 290, width: 120, height: 24 },
    { x: 3830, y: 205, width: 110, height: 24 },
    { x: 4020, y: 125, width: 140, height: 24 }
];

export const level2 = {
    id: 2,
    name: "The Winding Grove",
    groundY,
    worldWidth,
    platforms,
    spawn: { x: 80, feetY: groundY },
    enemies: [
        { startX: 1050, minX: 920, maxX: 1520, width: 32, height: 24, speed: 80 },
        { startX: 2150, minX: 1950, maxX: 2660, width: 32, height: 24, speed: 90 },
        { startX: 3200, minX: 3050, maxX: 3500, width: 32, height: 24, speed: 85 }
    ],
    finish: { platform: platforms[platforms.length - 1], flagInset: 40 }
};
