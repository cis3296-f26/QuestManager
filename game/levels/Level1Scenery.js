// Cosmetic placements on the redesigned ground islands; no collision geometry.
export const level1Scenery = [
    ...[420,1450,2420,4100,5540,7120,8580,10350,12000,13600,15020].map(x=>({type:"tree",x})),
    ...[150,1730,3200,4800,6270,7670,9360,11180,12800,14280,15450].map(x=>({type:"bush",x})),
    ...[280,650,1590,2130,2890,3450,3870,4580,5350,6080,6820,7510,8370,9120,9910,10890,11820,12520,13510,14020,14840,15780].map(x=>({type:"flowers",x}))
];
