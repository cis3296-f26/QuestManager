// Hand-placed scenery; density builds toward the heart and opens again at the flag.
// Branch anchors meet real platform undersides visually, but never add hitboxes.
export const level3Scenery = [
    { type: "tree", x: 280, baseY: 460, scale: .95, foliage: "#426b46" },
    { type: "tree", x: 740, baseY: 390, scale: 1.1, foliage: "#426b46" },
    { type: "branch-tree", x: 1160, top: 324, reach: 160, baseY: 430 },
    { type: "tree", x: 2020, baseY: 430, scale: 1.05, foliage: "#426b46" },
    { type: "trestle", x: 3820, top: 359, reach: 80 },
    { type: "trestle", x: 4540, top: 389, reach: 90 },
    ...[2500, 2900, 4200, 4800, 5550, 5820, 6100,
        7000, 7250, 8160, 8600, 9330, 9550, 10100, 10400, 10700,
        11200, 11450, 12100, 13300].map((x, i) => ({ type: "tree", x, scale: 1.15 + (i % 3) * .2, foliage: "#426b46" })),
    ...[{ x: 3300, top: 284, reach: 150 },
        { x: 6320, top: 359, reach: 100 }, { x: 7880, top: 284, reach: 140 },
        { x: 8980, top: 359, reach: 240 }, { x: 10890, top: 319, reach: 90 }]
        .map((anchor) => ({ type: "branch-tree", ...anchor })),
    { type: "bush", x: 2130, baseY: 430 },
    ...[150, 2740, 3870, 4320, 4660, 5580, 7310, 8510, 10220, 11100, 11600, 12200, 13820]
        .map((x) => ({ type: "bush", x })),
    { type: "flowers", x: 680, baseY: 390 },
    { type: "flowers", x: 1040, baseY: 430 },
    ...[ 2670, 3820, 4240, 4970, 6200, 6900, 7440, 10030, 10570, 11570, 12000, 13730]
        .map((x) => ({ type: "flowers", x }))
];
