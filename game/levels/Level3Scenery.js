// Hand-placed scenery; density builds toward the heart and opens again at the flag.
// Branch anchors meet real platform undersides visually, but never add hitboxes.
export const level3Scenery = [
    ...[300, 660, 1200, 1800, 2500, 2900, 3700, 4200, 4800, 5550, 5820, 6100,
        7000, 7250, 8100, 8600, 8950, 9300, 9550, 10100, 10400, 10700,
        11200, 11450, 12100, 13300].map((x, i) => ({ type: "tree", x, scale: 1.15 + (i % 3) * .2, foliage: "#426b46" })),
    ...[{ x: 3300, top: 284, reach: 150 }, { x: 4530, top: 284, reach: 90 },
        { x: 6320, top: 359, reach: 100 }, { x: 7880, top: 284, reach: 140 },
        { x: 8980, top: 319, reach: 120 }, { x: 10890, top: 319, reach: 90 }]
        .map((anchor) => ({ type: "branch-tree", ...anchor })),
    ...[150, 1940, 2740, 3870, 4320, 4660, 5580, 7310, 8510, 10220, 11100, 11600, 12200, 13820]
        .map((x) => ({ type: "bush", x })),
    ...[520, 1040, 2670, 3820, 4240, 4970, 6200, 6900, 7440, 10030, 10570, 11570, 12000, 13730]
        .map((x) => ({ type: "flowers", x }))
];
