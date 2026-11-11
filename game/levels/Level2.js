import { level2Scenery } from "./Level2Scenery.js";

const groundY = 460;
const worldWidth = 18000;

// Authored ground islands. Empty space between these intervals is a real pit.
// Gaps grow from 130 to 190 pixels; the existing 280/650/1800 movement can cross them.
const ground = [
    [0, 700], [830, 1680], [1840, 2820], [2990, 4450],
    [4620, 6150], [6330, 7700], [7880, 9300], [9490, 10800],
    [10980, 12600], [12790, 14200], [14390, 15750], [15930, worldWidth]
].map(([start, end]) => ({ x: start, y: groundY, width: end - start, height: 80 }));

// Explicit ledges, grouped by route rather than generated at random.
const ledges = [
    // Grove Gate: learn the rhythm on wide steps, then cross the first three pits.
    [200, 375, 140], [410, 295, 130], [610, 225, 120],
    [880, 375, 140], [1080, 295, 120], [1280, 220, 120],
    [1480, 300, 120], [1700, 360, 160],
    [1940, 375, 130], [2140, 290, 120], [2330, 210, 110],
    [2540, 280, 120], [2770, 330, 120],

    // Fern Walk: a rest clearing, then an optional ridge above the thorns.
    [3100, 375, 160], [3320, 295, 140], [3540, 215, 140],
    [3780, 290, 150], [4030, 375, 160, "collapsing"], [4270, 300, 150],

    // Canopy Crossing: the second coin sits beyond an elevated patrol.
    [4700, 375, 150], [4910, 295, 140], [5120, 215, 480],
    [5800, 300, 150], [6020, 375, 130],

    // Mushroom Bend: staggered landings, then a quiet stretch before the next gap.
    [6400, 375, 140], [6610, 295, 125], [6820, 215, 130],
    [7060, 290, 150], [7320, 375, 150], [7560, 300, 140],
    [8000, 375, 150], [8220, 295, 130], [8440, 215, 150],
    [8710, 290, 150], [9000, 375, 160],

    // Root Hollow: two thorn patches, each with a climb and a ground-jump route.
    [9650, 375, 150], [9870, 295, 130], [10090, 215, 140],
    [10350, 300, 150], [10610, 375, 140],
    [11120, 375, 140], [11330, 295, 130], [11540, 215, 150],
    [11810, 290, 150], [12100, 375, 150], [12340, 300, 150],

    // Sunbreak: a recovery clearing followed by a narrower ridge.
    [12930, 375, 150], [13150, 295, 130], [13370, 215, 140],
    [13620, 295, 140], [13890, 375, 150],

    // Sparrow Ledges: the optional third-coin route ends with an airborne pickup.
    [14520, 375, 150], [14740, 295, 140], [14970, 375, 130],
    [15140, 375, 130], [15350, 295, 115], [15560, 215, 110],
    [15750, 300, 110, "collapsing"],

    // The clearing after the coin jump gives room to recover before the flag.
    [16120, 375, 160], [16350, 295, 140], [16580, 215, 140],
    [16840, 300, 160], [17110, 375, 150],
    [17300, 375, 140], [17520, 295, 125], [17740, 215, 110],
    [17880, 215, 120]
].map(([x, y, width, type]) => ({ x, y, width, height: 24,
    ...(type ? { id: `grove-crumble-${x}`, type, collapseDelay: 1, appearance: "wood" } : {})
}));

// Optional ferry and lift routes supplement the original jumpable ground gaps.
// Existing enemy patrols remain entirely on static terrain.
const movingPlatforms = [
    { id: "grove-ferry", type: "moving", x: 660, y: 330, width: 110, height: 24,
        axis: "x", distance: 190, speed: 70, pause: 0.3, appearance: "wood" },
    { id: "grove-lift", type: "moving", x: 2890, y: 375, width: 100, height: 24,
        axis: "y", distance: -160, speed: 55, pause: 0.4, appearance: "wood" }
];
const platforms = [...ground, ...movingPlatforms, ...ledges];
const patrol = (appearance, startX, minX, maxX, speed, { feetY = groundY, stompable = false } = {}) =>
    ({ appearance, startX, minX, maxX, speed, feetY, stompable, width: 32, height: 24 });

export const level2 = {
    id: 2,
    name: "The Winding Grove",
    theme: "forest",
    mapSummary: "Forest · Canopy paths and winding clearings",
    groundY,
    worldWidth,
    platforms,
    spawn: { x: 80, feetY: groundY },
    scenery: level2Scenery,
    coins: [
        // Easy: on the opening path before any enemy or pit.
        { id: "level-2-coin-1", x: 520, y: 434 },
        // Medium: follow the canopy climb and jump over its mushroom patrol.
        { id: "level-2-coin-2", x: 5540, y: 185 },
        // Challenging: jump from the narrow x=15750 ledge across the last pit.
        { id: "level-2-coin-3", x: 15910, y: 190 }
    ],
    enemies: [
        patrol("slime", 1100, 1000, 1510, 80, { stompable: true }),
        patrol("mushroom", 2190, 2040, 2610, 85),
        patrol("slime", 3440, 3200, 3700, 80, { stompable: true }),
        patrol("slime", 4840, 4770, 5460, 90, { stompable: true }),
        patrol("mushroom", 5330, 5190, 5460, 55, { feetY: 215 }),
        patrol("mushroom", 6740, 6590, 7250, 90),
        patrol("slime", 8400, 8200, 8850, 95, { stompable: true }),
        patrol("mushroom", 10000, 9860, 10280, 90),
        patrol("slime", 11600, 11390, 11960, 95, { stompable: true }),
        patrol("mushroom", 13350, 13120, 13740, 90),
        patrol("slime", 14680, 14550, 14950, 95, { stompable: true }),
        patrol("mushroom", 16450, 16340, 16920, 95)
    ],
    hazards: [
        { type: "spikes", x: 3880, y: 440, width: 45, height: 20 },
        { type: "spikes", x: 7410, y: 440, width: 45, height: 20 },
        { type: "spikes", x: 10430, y: 440, width: 50, height: 20 },
        { type: "spikes", x: 12180, y: 440, width: 45, height: 20 },
        { type: "spikes", x: 13940, y: 440, width: 50, height: 20 },
        { type: "spikes", x: 17040, y: 440, width: 45, height: 20 }
    ],
    sections: [
        { x: 0, title: "The Winding Grove", hint: "Marked wooden platforms move. Jump away if cracks appear." },
        { x: 2990, title: "Fern Walk", hint: "Ride the lift or take the ground jump. Cracked ledges won't hold for long." },
        { x: 4620, title: "Canopy Crossing", hint: "A coin waits above. Give the mushroom room to pass." },
        { x: 6330, title: "Mushroom Bend", hint: "Watch the patrols before choosing your landing." },
        { x: 9490, title: "Root Hollow", hint: "The gaps are wider here. Jump near the edge." },
        { x: 12790, title: "Sunbreak Clearing", hint: "Catch your breath, then choose your route." },
        { x: 14390, title: "Sparrow Ledges", hint: "Explore the high path for one last gold coin." },
        { x: 15930, title: "The Grove Lookout", hint: "A final clearing, then climb to the flag." }
    ],
    finish: { platform: platforms[platforms.length - 1], flagInset: 40 }
};


