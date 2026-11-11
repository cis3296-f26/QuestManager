import { level1Scenery } from "./Level1Scenery.js";

const groundY = 460;
const worldWidth = 22000;

// Every ground segment is real collision geometry; no rectangles span the pits.
const platforms = [
    { x: 0, y: groundY, width: 820, height: 80 },
    { x: 930, y: groundY, width: 790, height: 80 },
    { x: 1870, y: groundY, width: 2430, height: 80 },
    { x: 4430, y: groundY, width: 1670, height: 80 },
    { x: 6250, y: groundY, width: 1550, height: 80 },
    { x: 7970, y: groundY, width: 1530, height: 80 },
    { x: 9660, y: groundY, width: 1540, height: 80 },
    { x: 11370, y: groundY, width: 1630, height: 80 },
    { x: 13180, y: groundY, width: 1420, height: 80 },
    { x: 14770, y: groundY, width: 1430, height: 80 },
    { x: 16380, y: groundY, width: 1720, height: 80 },
    { x: 18280, y: groundY, width: 1120, height: 80 },
    { x: 19580, y: groundY, width: 2420, height: 80 },

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
    { x: 3230, y: 190, width: 150, height: 24 },
    // Later routes are hand-placed, with room to recover between climbs.
    { x: 3600, y: 375, width: 180, height: 24 },
    { x: 3840, y: 300, width: 160, height: 24 },
    { x: 4070, y: 220, width: 160, height: 24 },
    { x: 4550, y: 375, width: 170, height: 24 },
    { x: 4780, y: 290, width: 150, height: 24 },
    { x: 5010, y: 210, width: 140, height: 24 },
    { x: 5230, y: 285, width: 170, height: 24 },
    { x: 5480, y: 365, width: 180, height: 24 },
    { x: 5770, y: 375, width: 140, height: 24 },
    { x: 5980, y: 300, width: 140, height: 24 },
    { x: 6400, y: 375, width: 160, height: 24 },
    { x: 6630, y: 295, width: 140, height: 24 },
    { x: 6860, y: 220, width: 140, height: 24 },
    { x: 7120, y: 300, width: 180, height: 24 },
    { x: 7410, y: 375, width: 170, height: 24 },
    { x: 7690, y: 300, width: 150, height: 24 },
    { x: 8150, y: 375, width: 180, height: 24 },
    { x: 8390, y: 300, width: 170, height: 24 },
    { x: 8650, y: 225, width: 160, height: 24 },
    { x: 8900, y: 300, width: 180, height: 24 },
    { x: 9220, y: 375, width: 170, height: 24 },
    { x: 9860, y: 375, width: 180, height: 24 },
    { x: 10100, y: 295, width: 160, height: 24 },
    { x: 10340, y: 220, width: 160, height: 24 },
    { x: 10620, y: 300, width: 180, height: 24 },
    { x: 10900, y: 375, width: 180, height: 24 },
    { x: 11540, y: 375, width: 150, height: 24 },
    { x: 11760, y: 290, width: 140, height: 24 },
    { x: 11980, y: 210, width: 140, height: 24 },
    { x: 12220, y: 290, width: 160, height: 24 },
    { x: 12500, y: 375, width: 180, height: 24 },
    { x: 12780, y: 300, width: 170, height: 24 },
    { x: 13400, y: 375, width: 180, height: 24 },
    { x: 13650, y: 300, width: 160, height: 24 },
    { x: 13900, y: 225, width: 160, height: 24 },
    { x: 14160, y: 300, width: 170, height: 24 },
    { x: 14420, y: 375, width: 150, height: 24 },
    { x: 15000, y: 375, width: 180, height: 24 },
    { x: 15240, y: 290, width: 160, height: 24 },
    { x: 15480, y: 215, width: 150, height: 24 },
    { x: 15740, y: 300, width: 170, height: 24 },
    { x: 16000, y: 375, width: 150, height: 24 },
    { x: 16600, y: 375, width: 160, height: 24 },
    { x: 16840, y: 295, width: 150, height: 24 },
    { x: 17080, y: 215, width: 150, height: 24 },
    { x: 17340, y: 290, width: 160, height: 24 },
    { x: 17600, y: 375, width: 180, height: 24 },
    { x: 17900, y: 300, width: 160, height: 24 },
    { x: 18500, y: 375, width: 170, height: 24 },
    { x: 18740, y: 290, width: 150, height: 24 },
    { x: 18980, y: 210, width: 150, height: 24 },
    { x: 19220, y: 300, width: 150, height: 24 },
    { x: 19800, y: 375, width: 170, height: 24 },
    { x: 20040, y: 295, width: 150, height: 24 },
    { x: 20700, y: 375, width: 170, height: 24 },
    { x: 20940, y: 295, width: 150, height: 24 },
    { x: 21170, y: 215, width: 150, height: 24 },
    { x: 21400, y: 215, width: 150, height: 24 },
    { x: 21650, y: 215, width: 240, height: 24 },
];

// Layout and placements belong here; movement and collision stay in shared modules.
export const level1 = {
    id: 1,
    name: "The First Adventure",
    groundY,
    worldWidth,
    platforms,
    spawn: { x: 80, feetY: groundY },
    scenery: level1Scenery,
    enemies: [
        {
            "appearance": "slime",
            "startX": 1100,
            "minX": 1000,
            "maxX": 1610,
            "speed": 70,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "mushroom",
            "startX": 2280,
            "minX": 2050,
            "maxX": 2550,
            "speed": 85,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "slime",
            "startX": 4650,
            "minX": 4550,
            "maxX": 5250,
            "speed": 75,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "mushroom",
            "startX": 6680,
            "minX": 6430,
            "maxX": 7190,
            "speed": 80,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "slime",
            "startX": 8300,
            "minX": 8120,
            "maxX": 8950,
            "speed": 80,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "mushroom",
            "startX": 9900,
            "minX": 9800,
            "maxX": 10370,
            "speed": 85,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "slime",
            "startX": 11800,
            "minX": 11540,
            "maxX": 12300,
            "speed": 85,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "mushroom",
            "startX": 13550,
            "minX": 13400,
            "maxX": 14150,
            "speed": 80,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "slime",
            "startX": 15000,
            "minX": 14900,
            "maxX": 15300,
            "speed": 85,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "mushroom",
            "startX": 16650,
            "minX": 16500,
            "maxX": 17280,
            "speed": 90,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "slime",
            "startX": 18600,
            "minX": 18480,
            "maxX": 19180,
            "speed": 85,
            "width": 32,
            "height": 24
        },
        {
            "appearance": "mushroom",
            "startX": 20220,
            "minX": 20200,
            "maxX": 20600,
            "speed": 80,
            "width": 32,
            "height": 24
        }
    ],
    hazards: [
        { type: "spikes", x: 5600, y: 440, width: 40, height: 20 },
        { type: "spikes", x: 10580, y: 440, width: 40, height: 20 },
        { type: "spikes", x: 15520, y: 440, width: 40, height: 20 },
        { type: "spikes", x: 20100, y: 440, width: 40, height: 20 }
    ],
    sections: [
        { x: 80, title: "The First Adventure", hint: "Move: A/D or arrows · Jump: Space, W or ↑" },
        { x: 3650, title: "Rolling Ridge", hint: "Watch the patrols. Higher paths offer another route." },
        { x: 6450, title: "Meadow Trail", hint: "Take a breath, then time the next crossing." },
        { x: 8170, title: "The Long Bridge", hint: "Let the creatures pass before dropping down." },
        { x: 11550, title: "Mushroom Hollow", hint: "Watch where you land." },
        { x: 15050, title: "Sunlit Fields", hint: "A clear landing matters more than a fast jump." },
        { x: 18550, title: "The Home Stretch", hint: "The flag is ahead. Keep your rhythm." },
        { x: 20700, title: "One Last Climb", hint: "Climb the grassy steps to reach the flag." }
    ],
    finish: { platform: platforms[platforms.length - 1], flagInset: 40 }
};
