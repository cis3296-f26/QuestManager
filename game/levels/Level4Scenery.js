// Fixed, sparse clusters. Crystal art is decoration, never an invisible platform.
export const level4Scenery=[
    ...[420,1100,2450,2900,3230,3990,4500,5580,6130,7080,7480,8580,
        8910,9300,9680,10550,11320,11920,12400,13250,13800,14400,15100,15700]
        .map((x,i)=>({type:"crystals",x,color:i%3===0?"#a99bdf":i%3===1?"#71d7d0":"#8fbfe3",size:i%3===2?1.2:1})),
    ...[800,2650,4170,5800,7160,8640,9400,10750,12060,13390,14770]
        .map(x=>({type:"rock",x})),
    ...[900,2750,5900,9450,13500].map(x=>({type:"wall-crystals",x}))
];
