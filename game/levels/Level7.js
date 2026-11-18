import { defineLevel, ground, ledge } from "./design/defineLevel.js";
import { level7Scenery } from "./Level7Scenery.js";
// Only blue ice opts into traction. White snow uses the established controls.
const iceSurface={type:"ice",acceleration:1000,braking:900,friction:600};
const material=ice=>({appearance:ice?"ice":"snow",...(ice?{surface:{...iceSurface}}:{})});
const bank=(id,x,end,y,ice=false)=>({...ground(`l7-${id}`,x,end),y,height:540-y,terrain:true,...material(ice)});
const shelf=(id,x,y,width,role="optional-route",ice=false,extra={})=>({...ledge(`l7-${id}`,x,y,width,role,extra),...material(ice)});
const slime=(id,x,min,max,feetY,purpose)=>({id:`l7-${id}`,appearance:"frost-slime",startX:x,minX:min,maxX:max,feetY,purpose,speed:70,width:32,height:24,stompable:true});
const owl=(id,x,min,max,feetY,purpose)=>({id:`l7-${id}`,appearance:"snow-owl",startX:x,minX:min,maxX:max,feetY,purpose,speed:60,width:34,height:26,stompable:false,flying:true});
const icicle=(id,x,triggerX,warningDuration=1)=>({id:`l7-${id}`,appearance:"icicle",x,y:110,width:26,height:48,speed:600,warningDuration,trigger:{x:triggerX,y:290,width:x-triggerX+40,height:180}});
const area=(id,title,kind,purpose,clue,bounds,entry,exit,platformIds,discovery,coin)=>({id:`l7-${id}`,title,kind,purpose,clue,bounds,
 entrance:{x:entry[0],y:entry[1]-64,width:50,height:64},exit:{x:exit[0],y:exit[1]-64,width:50,height:64},
 platformIds:platformIds.map(id=>`l7-${id}`),discoveryPlatforms:[`l7-${discovery}`],...(coin?{coinId:`level-7-coin-${coin}`}:{})});

export const level7=defineLevel({
 id:7,name:"Frozen Peaks",theme:"frozen",worldWidth:23500,spawn:{x:80,feetY:430},
 audio:{music:"frozen"},mapSummary:"Frozen Peaks · Learn ice control, cross the lake and explore glowing glacier chambers",scenery:level7Scenery,finishId:"l7-flag",
 developerLocations:[{id:"ice-lesson",label:"Ice lesson — safe snow approach",x:270,feetY:430},
 {id:"lake-crossing",label:"Frozen Lake — ferry departure",x:6120,feetY:380},
 {id:"glacier-entrance",label:"Glacier Caverns — snow observation bank",x:9430,feetY:460},
 {id:"icicle-lesson",label:"Icicle lesson — outside trigger",x:10010,feetY:400},
 {id:"blizzard-bridge",label:"Blizzard Pass — cracked bridge approach",x:15900,feetY:390},
 {id:"overlook-lift",label:"Frozen Overlook — lift departure",x:20560,feetY:390}],
 explorationAreas:[
  area("frozen-hollow","The Frozen Hollow","passage","Drop behind the snow arch into its lower ice pocket, brake and turn for gold, then return to the snow bank.","A stream shines beneath the overhang; the opening is visible from the eastern bank.",
   {x:3180,y:380,width:260,height:94},[3600,420],[3680,420],["hollow-ice"],"hollow-ice",1),
  area("snowline-ridge","The Snowline Ridge","alternate","Use a stable snow route above the second slippery lake floe, then rejoin before the ferry.","A pine-topped rock spine frames the dry upper ledges.",
   {x:5430,y:205,width:200,height:104},[5120,420],[6040,380],["ridge-step","snowline-ridge","ridge-exit"],"snowline-ridge"),
  area("glacier-chamber","The Blue Window","elevated","Climb the broken glacial window into a luminous upper chamber, collect its gold and descend to the lower tunnel.","A blue arch and a glint above the tunnel reveal a connected chamber.",
   {x:11810,y:180,width:190,height:129},[11140,450],[12420,460],["window-step","glacial-window","chamber-ice","chamber-exit"],"chamber-ice",2),
  area("blizzard-ridge","The Windless Crown","challenge","Brake on the upper approach, cross a short cracked ice shelf over the cleft, then control the crown landing before descending.","Bright ice edges and a cracked shelf lead above the lower snow gully.",
   {x:17080,y:205,width:180,height:104},[16530,400],[17400,440],["ridge-launch","ridge-crack","blizzard-crown"],"blizzard-crown",3)
 ],
 stages:[
 {id:"foothills",start:0,end:4000,difficulty:"medium",title:"Frozen Foothills",
 hint:"Blue ice carries momentum. Release early to brake; white snow stops normally. A sheltered stream runs beneath the far arch.",
 purpose:"Teach acceleration and coasting between safe snow catch areas before introducing a stream jump, a creature and an optional lower hollow.",
 beats:[{start:0,end:1430,title:"The Safe Ice Lesson"},{start:1430,end:2820,title:"Stream and Winter Watcher"},{start:2820,end:4000,title:"The Snow Arch Hollow"}],
 platforms:[bank("arrival",0,360,430),bank("practice-ice",360,650,430,true),bank("practice-catch",650,980,430),bank("stream-east",1100,1430,420),
  bank("first-icy-landing",1540,1780,440,true),bank("slime-court",1900,2320,460),bank("foothill-rise",2440,2700,420),bank("arch-step",2820,2990,400),
  shelf("snow-arch",3100,350,340,"main-route"),shelf("hollow-ice",3180,450,260,"optional-route",true),bank("hollow-return",3560,3850,420),bank("foothill-exit",3940,4000,460)],
 enemies:[slime("first-frost-slime",2070,2020,2140,460,"The first winter patrol follows the safe ice lesson on a broad ordinary snow bank.")],coins:[{id:"level-7-coin-1",x:3220,y:420}]},
 {id:"lake",start:4000,end:9000,difficulty:"medium-hard",title:"The Frozen Lake",
 hint:"Snow islands are your brakes. Choose the dry upper ridge or cross the blue floes; ride the ice ferry across the open lead.",
 purpose:"Develop momentum control over broad lake floes, offer a dry upper route, then cross the lake's open lead with a ferry.",
 beats:[{start:4000,end:5440,title:"The First Lake Floes"},{start:5440,end:6220,title:"Snowline or Shore"},{start:6220,end:7220,title:"The Open Lead"},{start:7220,end:9000,title:"The Eastern Shore"}],
 platforms:[bank("lake-arrival",4000,4380,460),bank("west-floe",4460,4920,460,true),bank("snow-island",5060,5330,420),bank("middle-floe",5440,5750,450,true),bank("ferry-west",5880,6220,380),
  shelf("lake-ferry",6300,380,160,"main-route",true,{type:"moving",axis:"x",distance:280,speed:65,pause:.5,connection:{from:"l7-ferry-west",to:"l7-ferry-east"}}),
  bank("ferry-east",6740,7080,380),bank("east-island",7220,7500,430),bank("owl-floe",7620,7980,450,true),bank("owl-landing",8120,8380,390),bank("glacier-shore",8520,8740,430),bank("glacier-ice",8840,9000,450,true),
  shelf("ridge-step",5160,325,160),shelf("snowline-ridge",5430,285,200),shelf("ridge-exit",5740,305,120)],
 enemies:[slime("island-watcher",5240,5200,5270,420,"A visible patrol guards the far half of the snow island, below an optional stable bypass."),owl("lake-owl",5570,5540,5610,235,"The owl guards the optional dry ridge; observe it from the snow step, or choose the lower ice route.")]},
 {id:"glacier",start:9000,end:14000,difficulty:"medium-hard",title:"The Glacier Caverns",
 hint:"Icicles show a clear warning before falling. Bait them from snow; a glowing window leads to the upper chamber.",
 purpose:"Enter an enclosed glacier, teach falling icicles on snow, then explore a luminous upper chamber before returning through deeper tunnels.",
 beats:[{start:9000,end:10200,title:"The Blue Mouth"},{start:10200,end:11360,title:"The Icicle Lesson"},{start:11360,end:12620,title:"The Glacial Window"},{start:12620,end:14000,title:"The Deep Tunnel"}],
 platforms:[bank("cave-ice-entry",9000,9240,450,true),bank("cave-snow-entry",9360,9660,460),bank("icicle-lookout",9780,10080,400),bank("icicle-floor",10200,10500,460),bank("cave-floe",10620,10920,430,true),bank("window-court",11040,11360,450),
  bank("window-lower",11480,11850,400),bank("chamber-underpass",11980,12200,450),bank("chamber-return",12320,12620,460,true),bank("tunnel-rise",12740,13000,400),bank("tunnel-patrol",13140,13500,460),bank("cave-exit",13640,14000,430),
  shelf("window-step",11300,355,150),shelf("glacial-window",11550,305,160),shelf("chamber-ice",11810,285,190,"optional-route",true),shelf("chamber-exit",12130,335,160)],
 enemies:[slime("tunnel-slime",13320,13280,13380,460,"One glacial patrol is separated from the final icicle's observation area.")],
 stalactites:[icicle("first-icicle",10420,10080,.9),icicle("window-icicle",12500,12160,1),icicle("exit-icicle",13820,13500,1.2)],
 coins:[{id:"level-7-coin-2",x:11920,y:200}]},
 {id:"blizzard",start:14000,end:19000,difficulty:"hard",title:"Blizzard Pass",
 hint:"Snow remains visible through the flurries. Brake before the cracked bridge; the high ice crown is optional.",
 purpose:"Combine learned ice control, safe snow recoveries and collapsing bridges, with a harder optional ridge above the lower gully.",
 beats:[{start:14000,end:15720,title:"The Exposed Snow Shelf"},{start:15720,end:16460,title:"The Cracked Ice Bridge"},{start:16460,end:17580,title:"The Optional High Crown"},{start:17580,end:19000,title:"The Last Owl"}],
 platforms:[bank("pass-arrival",14000,14320,430),bank("exposed-ice",14460,14820,400,true),bank("pass-patrol",14940,15220,440),bank("pass-floe",15340,15600,460,true),bank("bridge-west",15720,16020,390),
  shelf("bridge-crack-west",16100,390,120,"main-route",true,{type:"collapsing",collapseDelay:1.5,connection:{from:"l7-bridge-west",to:"l7-bridge-crack-east"}}),
  shelf("bridge-crack-east",16320,390,120,"main-route",true,{type:"collapsing",collapseDelay:1.5,connection:{from:"l7-bridge-crack-west",to:"l7-bridge-east"}}),
  bank("bridge-east",16460,16800,400),bank("lower-gully",16930,17100,470),bank("ridge-return",17140,17460,440),bank("pass-rest",17580,17840,400),bank("last-owl-ice",17980,18260,430,true),bank("last-owl-landing",18400,18700,380),bank("pass-exit",18840,19000,430),
  shelf("ridge-launch",16640,305,160),shelf("ridge-crack",16820,305,110,"optional-route",true,{type:"collapsing",collapseDelay:1.6,connection:{from:"l7-ridge-launch",to:"l7-blizzard-crown"}}),shelf("blizzard-crown",17080,285,180,"optional-route",true)],
 enemies:[slime("pass-slime",15110,15070,15160,440,"A patrol on normal snow separates two ice encounters, leaving a visible arrival zone."),owl("pass-owl",18140,18090,18230,290,"The final flying patrol times an exposed crossing after a safe recovery bank.")],
 coins:[{id:"level-7-coin-3",x:17150,y:230}]},
 {id:"overlook",start:19000,end:23500,difficulty:"medium-hard",title:"The Frozen Overlook",
 hint:"Use snow to regain control. The glacier lift reaches the high shelf; the flag ridge is clear and safe.",
 purpose:"Climb frozen stone formations, use a genuine high lift, then recover on increasingly dry rock beneath the northern cliffs.",
 beats:[{start:19000,end:20340,title:"The Upper Snow Columns"},{start:20340,end:21780,title:"The Glacier Lift"},{start:21780,end:23500,title:"The Northern Ridge"}],
 platforms:[bank("overlook-entry",19000,19320,430),bank("overlook-ice",19440,19780,390,true),bank("high-patrol",19920,20200,330),bank("lift-west",20340,20660,390),
  shelf("glacier-lift",20740,420,140,"main-route",false,{type:"moving",axis:"y",distance:-120,speed:50,pause:.5,connection:{from:"l7-lift-west",to:"l7-high-shelf"}}),
  bank("high-shelf",21020,21340,300),bank("overlook-rest",21480,21780,350),bank("last-floe",21900,22220,400,true),bank("north-ridge",22360,22700,350),bank("cliff-view",22840,23100,310),bank("flag",23240,23500,330)],
 enemies:[slime("high-slime",20070,20020,20110,330,"A lone upper guardian is visible across a broad snow column before the lift.")]}
 ]
});
for(const stage of level7.stages){
 stage.requiredRoute=stage.platforms.filter(p=>p.role==="main-route").map(p=>p.id);
 stage.optionalRoutes=level7.explorationAreas.filter(a=>a.platformIds.some(id=>stage.platforms.some(p=>p.id===id))).map(a=>({purpose:a.purpose,platforms:a.platformIds,...(a.coinId?{coinId:a.coinId}:{})}));
}
