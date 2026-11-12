import { defineLevel, ground, ledge, creature, thorns } from "./design/defineLevel.js";
import { level4Scenery } from "./Level4Scenery.js";
const g=(...a)=>({...ground(...a),appearance:"rock"});
const bank=(id,x,end,y)=>({...g(id,x,end),y,height:540-y,terrain:true});
const p=(...a)=>({...ledge(...a),appearance:"rock"});
const slime=(id,x,min,max,purpose)=>({...creature(id,"cave-slime",x,min,max,purpose,90),stompable:true});
const bat=(id,x,min,max,feetY,purpose)=>({...creature(id,"bat",x,min,max,purpose,80,feetY),flying:true,stompable:false,width:36});
const rock=(id,x,warningDuration=1)=>({id,x,y:92,width:24,height:54,warningDuration,speed:520,
    trigger:{x:x-110,y:200,width:220,height:330}});

export const level4=defineLevel({
    id:4,name:"Crystal Cave",theme:"cave",worldWidth:16000,spawn:{x:80,feetY:410},
    mapSummary:"Crystal Cave · Falling rocks, glowing passages and a sealed crystal vault",
    scenery:level4Scenery,audio:{music:"cave"},finishId:"l4-flag",
    landscape:{caveRooms:[
        {x:-200,width:860,roof:165},{x:750,width:680,roof:220},{x:1580,width:1000,roof:140},
        {x:2750,width:900,roof:190},{x:3820,width:720,roof:155}
    ]},
    explorationAreas:[
        {id:"l4-high-crystals",title:"Crystal Gallery",kind:"elevated",
            purpose:"Climb above the cave slime for the medium coin, then reconnect on the far bank.",
            clue:"A teal crystal cluster and a visible high shelf outline the upper route.",
            bounds:{x:3660,y:160,width:380,height:124},entrance:{x:3100,y:396,width:60,height:64},
            exit:{x:4500,y:396,width:60,height:64},platformIds:["l4-gallery-step-1","l4-gallery-step-2","l4-gallery","l4-gallery-exit"],
            discoveryPlatforms:["l4-gallery"],coinId:"level-4-coin-2",
            foreground:[{kind:"crystals",x:3820,y:234,width:110,height:50}]},
        {id:"l4-hidden-vault",title:"Hidden Crystal Passage",kind:"passage",
            purpose:"Cross the cracked slab, press the blue plate and enter the matching sealed vault for the last coin.",
            clue:"Blue runes on the plate match the nearby gate; crystals leave the ledge edge visible.",
            bounds:{x:12500,y:180,width:700,height:104},entrance:{x:11780,y:396,width:60,height:64},
            exit:{x:13400,y:396,width:40,height:64},
            platformIds:["l4-vault-step","l4-vault-crumble","l4-switch-shelf","l4-vault"],
            discoveryPlatforms:["l4-vault"],coinId:"level-4-coin-3",
            foreground:[{kind:"crystals",x:12960,y:233,width:125,height:50}]}
    ],
    stages:[
        {id:"entrance",start:0,end:2800,difficulty:"medium",title:"The Crystal Alcove",
            hint:"Take the stone arch or explore the lower crystal alcove for gold. Bats patrol above the far bank.",
            purpose:"Enter on a rock shelf, choose an arch crossing or lower coin alcove, then meet a slime and overhead bat with separate recovery banks.",
            requiredRoute:["l4-start","l4-entrance-bank","l4-entrance-arch","l4-entrance-east","l4-bat-bank","l4-entrance-return"],
            optionalRoutes:[{purpose:"Drop into the crystal alcove for the first coin, then jump from its far lip back to the main passage.",coinId:"level-4-coin-1",platforms:["l4-first-coin"]}],
            platforms:[bank("l4-start",0,420,410),bank("l4-entrance-bank",550,740,440),
                bank("l4-first-coin",740,1050,500),p("l4-entrance-arch",740,365,340,"alcove-bypass"),
                bank("l4-entrance-east",1150,1740,460),bank("l4-bat-bank",1880,2230,430),bank("l4-entrance-return",2230,2660,460)],
            enemies:[slime("l4-first-slime",1460,1410,1500,"A short ground patrol after the alcove return, with room to land after a stomp before the next pit."),
                bat("l4-first-bat",2050,1960,2150,335,"An overhead patrol on the raised bank; observe it from the approach and walk safely beneath.")],
            coins:[{id:"level-4-coin-1",x:900,y:470,difficulty:"easy"}]},
        {id:"passages",start:2800,end:6000,difficulty:"medium",title:"Crystal Passages",
            hint:"The lower passage continues. Teal crystals hint at a higher route to gold.",
            purpose:"Choose a direct lower path or climb the crystal gallery for Coin 2, then reconnect.",
            requiredRoute:["l4-gallery-ground","l4-passages-return"],
            optionalRoutes:[{purpose:"Climb the visible gallery shelves, collect gold and drop to the far bank.",coinId:"level-4-coin-2",platforms:["l4-gallery-step-1","l4-gallery-step-2","l4-gallery","l4-gallery-exit"]}],
            platforms:[g("l4-gallery-ground",2800,4200),g("l4-passages-return",4350,5840),
                p("l4-gallery-step-1",3180,365,180,"coin-route"),p("l4-gallery-step-2",3420,295,170,"coin-route"),
                p("l4-gallery",3660,260,380,"coin-route"),p("l4-gallery-exit",4150,335,120,"reconnection")],
            enemies:[slime("l4-gallery-slime",3380,3250,3550,"Guard the lower route; the coin branch is an avoidance alternative.")],
            coins:[{id:"level-4-coin-2",x:3930,y:230,difficulty:"medium"}]},
        {id:"falling-rocks",start:6000,end:9600,difficulty:"medium",title:"Stalactite Cavern",
            hint:"A teal-tipped rock shakes before it falls. Keep moving or bait it from safe ground.",
            purpose:"Teach one warning on broad ground, then combine rocks with a visible thorn bypass and familiar gaps.",
            requiredRoute:["l4-cavern-west","l4-cavern-middle","l4-cavern-east"],
            optionalRoutes:[{purpose:"Cross above the thorn patch instead of jumping it at ground level.",platforms:["l4-thorn-shelf"]}],
            platforms:[g("l4-cavern-west",6000,7200),g("l4-cavern-middle",7350,8660),g("l4-cavern-east",8820,9440),
                p("l4-thorn-shelf",6780,365,260,"hazard-bypass")],
            enemies:[slime("l4-cavern-slime",8130,8000,8340,"One ground patrol between rock encounters, with room to react.")],
            hazards:[thorns("l4-cavern-thorns",6940,40)],
            stalactites:[rock("l4-teaching-rock",6500,1.2),rock("l4-shelf-rock",6910,1.1),rock("l4-middle-rock",7670,1),rock("l4-last-cavern-rock",9020,.95)]},
        {id:"chamber",start:9600,end:13600,difficulty:"medium-hard",title:"Ancient Crystal Chamber",
            hint:"Ride the slab across the chasm. The blue pressure plate opens the matching optional vault.",
            purpose:"Combine known enemy timing and a ferry crossing, then offer a cracked-slab and gate puzzle for the final coin.",
            requiredRoute:["l4-chamber-west","l4-ferry-dock","l4-ferry","l4-ferry-landing","l4-chamber-east","l4-vault-return"],
            optionalRoutes:[{purpose:"Cross the cracked slab, press the blue plate and enter the high vault for Coin 3.",coinId:"level-4-coin-3",platforms:["l4-vault-step","l4-vault-crumble","l4-switch-shelf","l4-vault"]}],
            platforms:[g("l4-chamber-west",9600,10800),g("l4-chamber-east",11240,12100),g("l4-vault-return",12240,13440),
                p("l4-ferry-dock",10480,365,240,"ferry-dock"),
                p("l4-ferry",10820,365,140,"chasm-crossing",{type:"moving",axis:"x",distance:220,speed:65,pause:.45,connection:{from:"l4-ferry-dock",to:"l4-ferry-landing"}}),
                p("l4-ferry-landing",11240,365,160,"safe-landing"),p("l4-vault-step",11860,365,180,"puzzle-approach"),
                p("l4-vault-crumble",12100,335,140,"timed-puzzle-crossing",{type:"collapsing",collapseDelay:1.1,connection:{from:"l4-vault-step",to:"l4-switch-shelf"}}),
                p("l4-switch-shelf",12300,300,160,"switch-landing"),p("l4-vault",12500,260,700,"sealed-coin-route")],
            enemies:[slime("l4-chamber-slime",9850,9760,10000,"A ground challenge before the separate bat and safe ferry dock."),
                bat("l4-chamber-bat",10320,10240,10400,330,"Time the jump toward the dock; the waiting zone itself is clear.")],
            hazards:[thorns("l4-chamber-thorns",11730,40),thorns("l4-vault-ground-thorns",12940,40)],
            stalactites:[rock("l4-chamber-rock",10080,1.1),rock("l4-vault-rock",12620,1.1)],
            switches:[{id:"l4-blue-plate",x:12300,y:284,width:160,height:16,mode:"plate",gateIds:["l4-vault-gate"]}],
            gates:[{id:"l4-vault-gate",x:12700,y:100,width:28,height:184}],
            coins:[{id:"level-4-coin-3",x:13050,y:230,difficulty:"hard"}]},
        {id:"exit",start:13600,end:16000,difficulty:"medium",title:"Cave Exit",
            hint:"The crystals brighten ahead. One final gap, then a safe path to the flag.",
            purpose:"Recover after the chamber and finish with a familiar, readable crossing and no surprise hazards.",
            requiredRoute:["l4-exit-west","l4-flag"],
            optionalRoutes:[{purpose:"Use the raised bank to make the last gap more forgiving.",platforms:["l4-exit-takeoff"]}],
            platforms:[g("l4-exit-west",13600,14800),g("l4-flag",14950,16000),p("l4-exit-takeoff",14600,365,140,"gap-assist")]}
    ]
});
