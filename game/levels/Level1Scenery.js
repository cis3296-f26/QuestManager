// Cosmetic placements on the redesigned ground islands; no collision geometry.
export const level1Scenery = [
    // One identifiable oak supports the optional branch. Keep the banks and
    // takeoff edges clear; decoration bases match the new earth elevations.
    { type: "branch-tree", x: 500, top: 334, reach: 110, baseY: 410 },
    { type: "bush", x: 120, baseY: 365 }, { type: "bush", x: 1950, baseY: 430 },
    ...[{ x: 210, baseY: 365 }, { x: 670, baseY: 460 }, { x: 1070, baseY: 420 },
        { x: 1590, baseY: 460 }, { x: 1880, baseY: 430 }].map(d => ({ type: "flowers", ...d })),
    ...[2420,4100,5540,7120,8580,10350,12000,13600,15020].map(x=>({type:"tree",x})),
    ...[3200,4800,6270,7670,9360,11180,12800,14280,15450].map(x=>({type:"bush",x})),
    ...[2130,2890,3450,3870,4340,4580,5350,6080,6820,7510,8370,9120,9910,10890,11820,12520,13510,14020,14840,15780].map(x=>({type:"flowers",x}))
];

