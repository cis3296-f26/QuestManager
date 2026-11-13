import { defineLevel, ground, ledge } from "./design/defineLevel.js";
import { level5Scenery } from "./Level5Scenery.js";
const bank=(id,x,end,y)=>({...ground(id,x,end),y,height:540-y,terrain:true,appearance:"sandstone"});
const shelf=(id,x,y,width,role,extra={})=>({...ledge(id,x,y,width,role,extra),appearance:"sandstone"});
// Long desert journey: eighteen planned encounters across five major areas.
// Terrain stays rectangular and collectible IDs remain stable.
export const level5=defineLevel({
    id:5,name:"Sunscorched Dunes",theme:"desert",worldWidth:22000,spawn:{x:80,feetY:350},
    mapSummary:"Desert · A long ridge journey, wind-cut canyons, connected oasis pools and ancient ruins",
    audio:{music:"desert"},scenery:level5Scenery,finishId:"l5-flag",
    landscape:{desertMesas:[[-200,290,400],[460,255,260],[1020,310,350],[1650,270,330],[2350,300,400],[2940,245,310],[3450,315,430],[4090,270,260],[4610,290,420],[5250,245,340]],desertClouds:[[210,145],[810,180],[1390,130],[2080,165],[2710,145],[3300,180],[3930,135]]},
    explorationAreas:[
        {
            id:"l5-sandstone-alcove",
            title:"The Sheltered Hollow",
            kind:"passage",
            purpose:"Drop below the natural stone arch for easy gold, then jump out at the far lip.",
            clue:"A pale opening beneath the arch reveals the low sandstone shelf.",
            bounds:{x:2580,y:420,width:280,height:80},
            entrance:{x:2460,y:336,width:50,height:64},
            exit:{x:3010,y:376,width:50,height:64},
            platformIds:["l5-alcove"],
            discoveryPlatforms:["l5-alcove"],
            coinId:"level-5-coin-1",
            foreground:[{kind:"sandstone",x:2600,y:424,width:160,height:58}]
        },
        {
            id:"l5-oasis-overlook",
            title:"The Quiet Spring",
            kind:"elevated",
            purpose:"Climb the sheltered rock arch to look across the oasis, collect gold and return to the east bank.",
            clue:"A broken sandstone window and two spaced palms frame the upper ledge.",
            bounds:{x:11230,y:205,width:190,height:104},
            entrance:{x:10720,y:386,width:50,height:64},
            exit:{x:11650,y:376,width:50,height:64},
            platformIds:["l5-oasis-step","l5-oasis-arch","l5-oasis-window"],
            discoveryPlatforms:["l5-oasis-window"],
            coinId:"level-5-coin-2",
            foreground:[{kind:"sandstone",x:11260,y:220,width:110,height:72}]
        },
        {
            id:"l5-ridge-cache",
            title:"The Windward Cache",
            kind:"challenge",
            purpose:"Wait for calm on the departure ledge, cross two cracked shelves, collect gold and drop safely to the lower route.",
            clue:"Wind ribbons and cracked sandstone lead to the isolated upper outcrop.",
            bounds:{x:15830,y:205,width:160,height:104},
            entrance:{x:14920,y:336,width:50,height:64},
            exit:{x:16150,y:396,width:50,height:64},
            platformIds:["l5-ridge-launch","l5-crack-west","l5-crack-east","l5-windward-cache"],
            discoveryPlatforms:["l5-windward-cache"],
            coinId:"level-5-coin-3"
        },
        {
            id:"l5-canyon-shelter",
            title:"The Windless Passage",
            kind:"alternate",
            purpose:"Trade the exposed upper wind crossing for a low sheltered passage, then rejoin on the far bank.",
            clue:"A lower sandstone lip is visible below the wind ribbons.",
            bounds:{x:5900,y:420,width:410,height:80},
            entrance:{x:5670,y:386,width:50,height:64},
            exit:{x:6490,y:386,width:50,height:64},
            platformIds:["l5-canyon-shade"],
            discoveryPlatforms:["l5-canyon-shade"]
        },
        {
            id:"l5-palm-crown-route",
            title:"The Palm Crown",
            kind:"alternate",
            purpose:"Ride above the ford to a real elevated overlook and drop beside the next spring.",
            clue:"A stone lift points upward beside the palms; the crown cannot be reached with a single ground jump.",
            bounds:{x:10320,y:205,width:200,height:104},
            entrance:{x:9910,y:356,width:50,height:64},
            exit:{x:10630,y:386,width:50,height:64},
            platformIds:["l5-palm-lift","l5-palm-crown"],
            discoveryPlatforms:["l5-palm-crown"]
        }
    ],
    stages:[
        {
            id:"arrival",
            start:0,
            end:4000,
            difficulty:"easy-medium",
            title:"The Desert Arrival",
            hint:"Follow the ridge down. The stone arch shelters a low passage; scorpions must be jumped over.",
            purpose:"Follow a descending ridge journey, meet a lone wash patrol, choose the sheltered alcove, then cross the open rim into the canyon.",
            beats:[
                {start:0,end:1800,title:"The Cave Exit Ridges"},
                {start:1800,end:3300,title:"The Sheltered Arch"},
                {start:3300,end:4000,title:"The Outer Rim"}
            ],
            requiredRoute:["l5-cave-exit","l5-warm-shoulder","l5-dry-wash","l5-arrival-ridge","l5-arrival","l5-shoulder","l5-arrival-arch","l5-arrival-east","l5-outer-rim","l5-canyon-mouth"],
            optionalRoutes:[{"purpose":"Drop into the sheltered low alcove, then climb its far lip.","coinId":"level-5-coin-1","platforms":["l5-alcove"]}],
            platforms:[
                bank("l5-cave-exit",0,420,350),
                bank("l5-warm-shoulder",540,820,400),
                bank("l5-dry-wash",950,1240,450),
                bank("l5-arrival-ridge",1370,1670,400),
                bank("l5-arrival",1800,2200,350),
                bank("l5-shoulder",2320,2560,400),
                bank("l5-alcove",2560,2880,500),
                shelf("l5-arrival-arch",2560,365,380,"alcove-bypass"),
                bank("l5-arrival-east",3000,3300,440),
                bank("l5-outer-rim",3440,3700,400),
                bank("l5-canyon-mouth",3840,4000,440)
            ],
            enemies:[
                {id:"l5-wash-scorpion",appearance:"scorpion",startX:1080,minX:1050,maxX:1140,feetY:450,width:38,height:26,speed:64,stompable:false,
                    purpose:"First isolated patrol in a broad wash; the arrival bank leaves 100px to observe it."},
                {id:"l5-arrival-scorpion",appearance:"scorpion",startX:3150,minX:3080,maxX:3190,speed:64,feetY:440,width:38,height:26,stompable:false,
                    purpose:"An isolated introduction, after a clear landing and before the broad canyon lookout."}
            ],
            coins:[
                {id:"level-5-coin-1",x:2720,y:470,difficulty:"easy"}
            ]
        },
        {
            id:"canyon",
            start:4000,
            end:9000,
            difficulty:"medium",
            title:"Wind-Cut Canyon",
            hint:"Read each gust. The low shade avoids the exposed rim; the stone ferry crosses the great chasm.",
            purpose:"Progress from tailwind and headwind ledges to a sheltered route choice, a ferry across a 460px chasm and an exposed exit fin.",
            beats:[
                {start:4000,end:5800,title:"Learning the Gusts"},
                {start:5800,end:6700,title:"Rim or Shade"},
                {start:6700,end:7840,title:"The Great Chasm"},
                {start:7840,end:9000,title:"The Exit Fin"}
            ],
            requiredRoute:["l5-lookout","l5-canyon-west","l5-canyon-pillar","l5-canyon-recovery","l5-canyon-rim","l5-shade-return","l5-wind-dock","l5-canyon-ferry","l5-wind-landing","l5-canyon-dell","l5-exit-fin","l5-canyon-east"],
            optionalRoutes:[{"purpose":"Drop into the wind-free shaded passage instead of timing the exposed rim; rejoin before the ferry.","platforms":["l5-canyon-shade"]}],
            platforms:[
                bank("l5-lookout",4000,4380,440),
                bank("l5-canyon-west",4540,4780,440),
                bank("l5-canyon-pillar",4950,5140,400),
                bank("l5-canyon-recovery",5290,5800,450),
                shelf("l5-canyon-rim",5920,390,360,"exposed-rim-crossing"),
                bank("l5-canyon-shade",5880,6330,500),
                bank("l5-shade-return",6460,6700,450),
                bank("l5-wind-dock",6820,7100,365),
                shelf("l5-canyon-ferry",7180,365,150,"wide-canyon-transfer",{"type":"moving","axis":"x","distance":220,"speed":65,"pause":0.45,"connection":{"from":"l5-wind-dock","to":"l5-wind-landing"}}),
                bank("l5-wind-landing",7560,7840,365),
                bank("l5-canyon-dell",7960,8240,430),
                bank("l5-exit-fin",8390,8620,380),
                bank("l5-canyon-east",8760,9000,430)
            ],
            enemies:[
                {id:"l5-canyon-scorpion",appearance:"scorpion",startX:5560,minX:5500,maxX:5620,speed:64,feetY:450,width:38,height:26,stompable:false,
                    purpose:"A visible patrol well after the canyon landing, keeping the recovery area useful."},
                {id:"l5-dell-scorpion",appearance:"scorpion",startX:8110,minX:8060,maxX:8150,feetY:430,width:38,height:26,speed:64,stompable:false,
                    purpose:"A single visible patrol after the ferry landing and descent; the next wind jump has its own clear takeoff."}
            ],
            windZones:[
                {id:"l5-first-tailwind",x:4240,y:190,width:400,height:200,direction:1,strength:60,period:5.8,offset:0,warning:0.9,duration:2.4,
                    purpose:"An introductory tailwind; the first gap remains possible during calm."},
                {id:"l5-canyon-headwind",x:4800,y:190,width:440,height:200,direction:-1,strength:75,period:6.4,offset:1.3,warning:0.9,duration:2.4,
                    purpose:"Observe from the west bank before climbing the exposed pillar."},
                {id:"l5-rim-wind",x:5890,y:190,width:440,height:200,direction:-1,strength:80,period:6.8,offset:0.2,warning:0.9,duration:2.4,
                    purpose:"An exposed upper crossing, with a genuinely sheltered lower route below the gust."},
                {id:"l5-ferry-breeze",x:7080,y:190,width:490,height:110,direction:1,strength:50,period:6.5,offset:1.8,warning:0.9,duration:2.4,
                    purpose:"A light airborne boarding/exit assist; grounded ferry riders remain below the wind."},
                {id:"l5-canyon-exit-wind",x:8260,y:190,width:530,height:200,direction:1,strength:90,period:7,offset:0.5,warning:0.9,duration:2.4,
                    purpose:"A stronger tailwind at the exit fin, after a wind-free waiting bank."}
            ]
        },
        {
            id:"oasis",
            start:9000,
            end:13200,
            difficulty:"medium",
            title:"The Hidden Oasis",
            hint:"Follow the pools. The lift reaches the palm crown; the old stone window hides the spring’s gold.",
            purpose:"Discover three connected pools, choose a low ford or a high palm overlook, explore the sheltered coin window, then climb out through reeds.",
            beats:[
                {start:9000,end:9790,title:"The Reed Pond"},
                {start:9790,end:10600,title:"The Palm Crown"},
                {start:10600,end:12200,title:"The Quiet Spring"},
                {start:12200,end:13200,title:"The Eastern Ford"}
            ],
            requiredRoute:["l5-oasis-entry","l5-reed-pond","l5-palm-bank","l5-reed-ford","l5-oasis-west","l5-pool-bed","l5-oasis-east","l5-oasis-return","l5-east-pool","l5-oasis-ridge","l5-oasis-lip"],
            optionalRoutes:[{"purpose":"Ride to the palm crown for a skyline shortcut over the lower ford, then descend beside the quiet spring.","platforms":["l5-palm-lift","l5-palm-crown"]},{"purpose":"Follow the rock arch above the spring to its sheltered window and medium coin.","coinId":"level-5-coin-2","platforms":["l5-oasis-step","l5-oasis-arch","l5-oasis-window"]}],
            platforms:[
                bank("l5-oasis-entry",9000,9300,430),
                bank("l5-reed-pond",9300,9700,500),
                bank("l5-palm-bank",9790,10050,420),
                bank("l5-reed-ford",10160,10420,450),
                shelf("l5-palm-lift",10055,420,100,"palm-overlook-lift",{"type":"moving","axis":"y","distance":-135,"speed":55,"pause":0.4,"connection":{"from":"l5-palm-bank","to":"l5-palm-crown"}}),
                shelf("l5-palm-crown",10320,285,200,"oasis-skyline-route"),
                bank("l5-oasis-west",10600,10920,450),
                bank("l5-pool-bed",10920,11410,500),
                bank("l5-oasis-east",11530,11780,440),
                bank("l5-oasis-return",11900,12200,400),
                shelf("l5-oasis-step",10780,355,180,"overlook-departure"),
                shelf("l5-oasis-arch",11010,285,180,"arch-route"),
                shelf("l5-oasis-window",11230,285,190,"overlook-reward"),
                bank("l5-east-pool",12320,12680,460),
                bank("l5-oasis-ridge",12800,13020,400),
                bank("l5-oasis-lip",13140,13200,400)
            ],
            coins:[
                {id:"level-5-coin-2",x:11350,y:255,difficulty:"medium"}
            ]
        },
        {
            id:"ridge",
            start:13200,
            end:18200,
            difficulty:"medium-hard",
            title:"Scorpion Ridge",
            hint:"Read patrols before the gusts. Upper gold is optional; keep moving across the later broken bridge.",
            purpose:"Separate patrol timing, a stronger headwind, the optional cracked coin route and a mandatory broken bridge with recovery between each encounter.",
            beats:[
                {start:13200,end:14900,title:"Patrol and Shear"},
                {start:14900,end:16800,title:"The Windward Cache"},
                {start:16800,end:17440,title:"The Broken Span"},
                {start:17440,end:18200,title:"The Eastern Watch"}
            ],
            requiredRoute:["l5-ridge-entry","l5-patrol-wash","l5-shear-pillar","l5-thorn-dell","l5-ridge-approach","l5-ridge-west","l5-scorpion-bank","l5-ridge-middle","l5-ridge-rejoin","l5-ridge-east","l5-bridge-west","l5-bridge-crack-a","l5-bridge-crack-b","l5-bridge-east","l5-ridge-last"],
            optionalRoutes:[{"purpose":"Cross above the scorpion and real canyon on collapsing stone, then reach the windward cache.","coinId":"level-5-coin-3","platforms":["l5-ridge-launch","l5-crack-west","l5-crack-east","l5-windward-cache"]}],
            platforms:[
                bank("l5-ridge-entry",13200,13540,400),
                bank("l5-patrol-wash",13680,13960,450),
                bank("l5-shear-pillar",14110,14320,400),
                bank("l5-thorn-dell",14440,14680,460),
                bank("l5-ridge-approach",14820,14900,400),
                bank("l5-ridge-west",14900,15210,400),
                bank("l5-scorpion-bank",15290,15550,460),
                bank("l5-ridge-middle",15700,15940,460),
                bank("l5-ridge-rejoin",16050,16290,460),
                bank("l5-ridge-east",16440,16800,400),
                shelf("l5-ridge-launch",15120,305,120,"wind-observation"),
                shelf("l5-crack-west",15350,305,100,"above-scorpion",{"type":"collapsing","collapseDelay":1.2,"connection":{"from":"l5-ridge-launch","to":"l5-crack-east"}}),
                shelf("l5-crack-east",15570,305,120,"canyon-collapse",{"type":"collapsing","collapseDelay":1.2,"connection":{"from":"l5-crack-west","to":"l5-windward-cache"}}),
                shelf("l5-windward-cache",15830,285,160,"wind-route-reward"),
                bank("l5-bridge-west",16800,17000,400),
                shelf("l5-bridge-crack-a",17080,400,120,"required-pit-crossing",{"type":"collapsing","collapseDelay":1.4,"connection":{"from":"l5-bridge-west","to":"l5-bridge-crack-b"}}),
                shelf("l5-bridge-crack-b",17300,400,120,"required-pit-crossing",{"type":"collapsing","collapseDelay":1.4,"connection":{"from":"l5-bridge-crack-a","to":"l5-bridge-east"}}),
                bank("l5-bridge-east",17440,17780,430),
                bank("l5-ridge-last",17920,18200,380)
            ],
            enemies:[
                {id:"l5-wash-guard",appearance:"scorpion",startX:13800,minX:13770,maxX:13850,feetY:450,width:38,height:26,speed:64,stompable:false,
                    purpose:"A readable patrol before the separate shear jump; there is safe space to wait before the gust."},
                {id:"l5-lower-scorpion",appearance:"scorpion",startX:15410,minX:15380,maxX:15430,speed:64,feetY:460,width:38,height:26,stompable:false,
                    purpose:"Guards the lower bank; the cracked upper route bypasses this patrol."},
                {id:"l5-ridge-scorpion",appearance:"scorpion",startX:16540,minX:16510,maxX:16630,speed:64,feetY:400,width:38,height:26,stompable:false,
                    purpose:"One final visible patrol after a separate recovery landing."},
                {id:"l5-bridge-guard",appearance:"scorpion",startX:18050,minX:18020,maxX:18120,feetY:380,width:38,height:26,speed:64,stompable:false,
                    purpose:"A final ridge patrol after a wind-free recovery bank and a separate approach jump; the bridge landing itself stays safe."}
            ],
            hazards:[
                {id:"l5-dell-thorns",type:"spikes",x:14580,y:440,width:40,height:20},
                {id:"l5-ridge-thorns",type:"spikes",x:15020,y:380,width:36,height:20}
            ],
            windZones:[
                {id:"l5-ridge-shear",x:13960,y:190,width:510,height:200,direction:-1,strength:95,period:7,offset:0.4,warning:0.9,duration:2.4,
                    purpose:"Read the stronger headwind from the patrol bank before climbing the shear pillar."},
                {id:"l5-ridge-wind",x:15240,y:190,width:580,height:200,direction:-1,strength:85,period:6.6,offset:0.7,warning:0.9,duration:2.4,
                    purpose:"A visible headwind over the optional cracked route; the launch ledge is outside the gust."}
            ],
            coins:[
                {id:"level-5-coin-3",x:15930,y:255,difficulty:"hard"}
            ]
        },
        {
            id:"ruins",
            start:18200,
            end:22000,
            difficulty:"medium",
            title:"The Ruins Approach",
            hint:"One last familiar breeze across the broken bridge. Beyond the outer court, the flag ridge is safe.",
            purpose:"Travel past broken bridge remnants and increasingly visible pillars, apply one last familiar wind jump, then recover in the outer court and climb to the flag.",
            beats:[
                {start:18200,end:19700,title:"The Fallen Bridge"},
                {start:19700,end:20600,title:"The Outer Court"},
                {start:20600,end:22000,title:"The Flag Ridge"}
            ],
            requiredRoute:["l5-ruins-entry","l5-fallen-court","l5-ruin-bridge","l5-outer-court","l5-ruin-dell","l5-ruins-gate","l5-ruins-low","l5-ruins-middle","l5-ruins-high","l5-flag"],
            optionalRoutes:[],
            platforms:[
                bank("l5-ruins-entry",18200,18560,380),
                bank("l5-fallen-court",18700,18940,430),
                shelf("l5-ruin-bridge",19060,350,210,"broken-bridge-remnant"),
                bank("l5-outer-court",19400,19700,400),
                bank("l5-ruin-dell",19840,20140,450),
                bank("l5-ruins-gate",20260,20500,400),
                bank("l5-ruins-low",20600,20880,400),
                bank("l5-ruins-middle",21020,21260,350),
                bank("l5-ruins-high",21400,21620,310),
                bank("l5-flag",21740,22000,350)
            ],
            windZones:[
                {id:"l5-ruin-tailwind",x:18970,y:190,width:490,height:200,direction:1,strength:65,period:7.1,offset:2,warning:0.9,duration:2.4,
                    purpose:"A familiar final tailwind across a broken sandstone bridge, followed by a wind-free courtyard."}
            ]
        }
    ]
});
