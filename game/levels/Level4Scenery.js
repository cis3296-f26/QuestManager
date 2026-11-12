// Fixed, sparse clusters. Crystal art is decoration, never an invisible platform.
export const level4Scenery=[
    ...[{x:250,baseY:410},{x:640,baseY:440},{x:840,baseY:500},{x:1000,baseY:500},
        {x:1260,baseY:460},{x:2020,baseY:430},{x:2440,baseY:460}]
        .map(d=>({type:"crystals",color:"#71d7d0",size:1,...d})),
    {type:"cave-arch",x:910,top:389,reach:170,baseY:500},
    {type:"cave-arch",x:3850,top:284,reach:190},
    {type:"cave-arch",x:6910,top:389,reach:130},
    {type:"cave-arch",x:12850,top:284,reach:350},
    ...[2900,3230,3990,4500,5580,6130,7080,7480,8580,
        8910,9300,9680,10550,11320,11920,12400,13250,13800,14400,15100,15700]
        .map((x,i)=>({type:"crystals",x,color:i%3===0?"#a99bdf":i%3===1?"#71d7d0":"#8fbfe3",size:i%3===2?1.2:1})),
    ...[2650,4170,5800,7160,8640,9400,10750,12060,13390,14770]
        .map(x=>({type:"rock",x})),
    ...[900,2750,5900,9450,13500].map(x=>({type:"wall-crystals",x}))
];
