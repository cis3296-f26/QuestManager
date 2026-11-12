// Cosmetic forest clusters. They never enter the physics platform list.
export const level2Scenery = [
    { type: "tree", x: 240, baseY: 460 }, { type: "tree", x: 780, baseY: 420, scale: .7 },
    { type: "tree", x: 1430, baseY: 460, scale: .85 }, { type: "tree", x: 1730, baseY: 430, scale: .8 },
    { type: "trestle", x: 1140, top: 359, reach: 180, baseY: 460 },
    { type: "branch-tree", x: 2310, top: 319, reach: 100 },
    { type: "trestle", x: 3745, top: 359, reach: 225 },
    { type: "branch-tree", x: 5360, top: 284, reach: 240 },
    { type: "branch-tree", x: 6025, top: 359, reach: 125 },
    { type: "branch-tree", x: 15610, top: 284, reach: 70 },
    { type: "trestle", x: 16740, top: 359, reach: 390 },
    ...[3370, 4310, 4790, 6500, 6950, 7380, 8130, 8520, 9060,
        9760, 10130, 10570, 11200, 11700, 12360, 13000, 13430,
        13970, 14600, 15190, 16100, 17670].map(x => ({ type: "tree", x })),
    ...[110, 1890, 3320, 5720, 6410, 8010, 9580, 11070,
        12860, 14460, 16020, 17390].map((x) => ({ type: "bush", x })),
    { type: "flowers", x: 710, baseY: 420 },
    ...[340, 960, 1450, 1960, 2670, 3330, 4380, 4700, 5650,
        6040, 6480, 7500, 7980, 9140, 9630, 10690, 11100,
        12480, 12930, 14090, 14500, 15300, 15470, 16030, 17270, 17850]
        .map((x) => ({ type: "flowers", x }))
];

