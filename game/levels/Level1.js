import { level1Scenery } from "./Level1Scenery.js";
import { defineLevel, ground as g, ledge as p, creature as e, thorns as h } from "./design/defineLevel.js";

export const level1 = defineLevel({
    id: 1, name: "The First Adventure", worldWidth: 16000, audio: { music: "grassland" },
    spawn: { x: 80, feetY: 460 }, scenery: level1Scenery, finishId: "l1-flag",
    explorationAreas: [
        {
            id: "l1-meadow-canopy", title: "Meadow Overlook", kind: "elevated",
            purpose: "Follow the partly visible upper shelf to the medium coin, then drop back to the meadow.",
            clue: "Cream flowers and a visible shelf edge beyond the meadow steps.",
            bounds: { x: 4380, y: 160, width: 240, height: 124 },
            entrance: { x: 3820, y: 396, width: 60, height: 64 },
            exit: { x: 4920, y: 396, width: 60, height: 64 },
            platformIds: ["l1-coin-step-1", "l1-coin-step-2", "l1-coin-perch", "l1-coin-exit"],
            discoveryPlatforms: ["l1-coin-perch"], coinId: "level-1-coin-2",
            foreground: [{ kind: "leaves", x: 4390, y: 240, width: 110, height: 46 }]
        },
        {
            id: "l1-clover-hollow", title: "Clover Hollow", kind: "passage",
            purpose: "A sheltered lower connector beneath the overlook, with an easy drop back to safe ground.",
            clue: "A gap in the hedge exposes the edge of a low grassy shelf.",
            bounds: { x: 4430, y: 290, width: 160, height: 75 },
            entrance: { x: 4350, y: 396, width: 60, height: 64 },
            exit: { x: 4920, y: 396, width: 60, height: 64 },
            platformIds: ["l1-clover-shelf", "l1-coin-exit"], discoveryPlatforms: ["l1-clover-shelf"],
            foreground: [{ kind: "hedge", x: 4435, y: 309, width: 150, height: 70 }]
        }
    ],
    stages: [
        {
            id: "introduction", start: 0, end: 2040, difficulty: "easy",
            title: "The First Adventure", hint: "Learn the jumps. A slime can be stomped from above.",
            purpose: "Collect on the main path, practice a short climb, then meet one isolated slime.",
            requiredRoute: ["l1-start", "l1-first-landing"],
            optionalRoutes: [{ purpose: "Practice climbing with a safe return before the first enemy.", platforms: ["l1-practice-1", "l1-practice-2", "l1-practice-3"] }],
            platforms: [g("l1-start", 0, 820), g("l1-first-landing", 930, 1900),
                p("l1-practice-1", 220, 365, 160, "practice"), p("l1-practice-2", 440, 295, 150, "practice"),
                p("l1-practice-3", 650, 260, 170, "practice")],
            enemies: [e("l1-first-slime", "slime", 1300, 1200, 1450, "An isolated first stomp after a generous pit landing.", 70)],
            coins: [{ id: "level-1-coin-1", x: 540, y: 434, difficulty: "easy" }]
        },
        {
            id: "exploration", start: 2040, end: 5200, difficulty: "easy",
            title: "Meadow Choices", hint: "The upper path avoids mushrooms. Look for gold above the meadow.",
            purpose: "Choose a mushroom bypass, recover, then explore a distinct coin branch.",
            requiredRoute: ["l1-meadow", "l1-coin-meadow"],
            optionalRoutes: [
                { purpose: "Avoid the first mushroom rather than attack it.", platforms: ["l1-bypass-1", "l1-bypass-2", "l1-bypass-exit"] },
                { purpose: "Collect the medium coin and reconnect to the main path.", coinId: "level-1-coin-2", platforms: ["l1-coin-step-1", "l1-coin-step-2", "l1-coin-perch", "l1-coin-exit"] },
                { purpose: "Explore the sheltered lower shelf beneath the overlook and reconnect to its exit.", platforms: ["l1-clover-shelf", "l1-coin-exit"] }
            ],
            platforms: [g("l1-meadow", 2040, 3650), g("l1-coin-meadow", 3790, 5060),
                p("l1-bypass-1", 2250, 365, 220, "enemy-bypass"), p("l1-bypass-2", 2500, 295, 220, "enemy-bypass"),
                p("l1-bypass-exit", 2800, 365, 160, "recovery"),
                p("l1-coin-step-1", 3900, 365, 170, "coin-route"), p("l1-coin-step-2", 4140, 295, 160, "coin-route"),
                p("l1-coin-perch", 4380, 260, 240, "coin-route"), p("l1-clover-shelf", 4430, 365, 160, "secret-connector"),
                p("l1-coin-exit", 4740, 335, 180, "recovery")],
            enemies: [e("l1-first-mushroom", "mushroom", 2620, 2530, 2700, "Introduce a slower mushroom beneath the center of its visible bypass.", 60),
                e("l1-coin-slime", "slime", 4100, 4010, 4290, "Guard the lower route, leaving the upper coin perch clear.", 70)],
            coins: [{ id: "level-1-coin-2", x: 4500, y: 230, difficulty: "medium" }]
        },
        {
            id: "challenge", start: 5200, end: 8200, difficulty: "easy-medium",
            title: "Rolling Ridge", hint: "Jump the thorns or take the raised crossing.",
            purpose: "Practice enemies and thorns in separate encounters with safe recovery space.",
            requiredRoute: ["l1-thorn-field", "l1-mushroom-field"],
            optionalRoutes: [{ purpose: "Cross above thorns.", platforms: ["l1-thorn-approach", "l1-thorn-bridge", "l1-thorn-exit"] },
                { purpose: "Bypass a mushroom with a shallow climb.", platforms: ["l1-mushroom-step", "l1-mushroom-bridge", "l1-mushroom-exit"] }],
            platforms: [g("l1-thorn-field", 5200, 6500), g("l1-mushroom-field", 6650, 8050),
                p("l1-thorn-approach", 5590, 365, 180, "stomp-opportunity"), p("l1-thorn-bridge", 5840, 300, 240, "hazard-bypass"),
                p("l1-thorn-exit", 6160, 365, 180, "recovery"), p("l1-mushroom-step", 6870, 365, 200, "enemy-bypass"),
                p("l1-mushroom-bridge", 7130, 295, 200, "enemy-bypass"), p("l1-mushroom-exit", 7420, 365, 180, "recovery")],
            enemies: [e("l1-thorn-slime", "slime", 5600, 5480, 5780, "A stomp opportunity before a separate thorn challenge."),
                e("l1-ridge-mushroom", "mushroom", 7160, 7000, 7350, "An avoidance encounter with recovery space on both sides.")],
            hazards: [h("l1-first-thorns", 5980)]
        },
        {
            id: "combined", start: 8200, end: 11600, difficulty: "medium",
            title: "Sunlit Fields", hint: "Choose your landing. There is room to recover between encounters.",
            purpose: "Combine familiar enemies and hazards while keeping their landing zones separate.",
            requiredRoute: ["l1-sunlit-west", "l1-sunlit-east"],
            optionalRoutes: [{ purpose: "Stomp or bypass the slime, then cross the thorns.", platforms: ["l1-sunlit-stomp", "l1-sunlit-hop"] },
                { purpose: "Avoid the mushroom on the upper lane.", platforms: ["l1-east-step", "l1-east-bridge", "l1-east-exit"] }],
            platforms: [g("l1-sunlit-west", 8200, 9600), g("l1-sunlit-east", 9760, 11440),
                p("l1-sunlit-stomp", 8430, 365, 190, "stomp-opportunity"), p("l1-sunlit-hop", 9010, 365, 220, "hazard-bypass"),
                p("l1-east-step", 10020, 365, 200, "enemy-bypass"), p("l1-east-bridge", 10280, 295, 200, "enemy-bypass"),
                p("l1-east-exit", 10550, 335, 200, "recovery")],
            enemies: [e("l1-sunlit-slime", "slime", 8650, 8520, 8850, "Reinforce stomping without placing thorns at the stomp landing.", 80),
                e("l1-sunlit-mushroom", "mushroom", 10400, 10250, 10600, "Guard the lower lane with a clear raised alternative.")],
            hazards: [h("l1-sunlit-thorns", 9180), h("l1-east-thorns", 11100)]
        },
        {
            id: "final-challenge", start: 11600, end: 14500, difficulty: "medium",
            title: "The Last Gold Coin", hint: "The high route leads to gold. A safe meadow waits across the gap.",
            purpose: "Offer a difficult optional coin jump, followed by a safe landing and one last slime choice.",
            requiredRoute: ["l1-gold-west", "l1-gold-recovery"],
            optionalRoutes: [{ purpose: "Avoid the mushroom, climb, and jump for the difficult coin.", coinId: "level-1-coin-3",
                platforms: ["l1-gold-bypass", "l1-gold-bridge", "l1-gold-rest", "l1-gold-step-1", "l1-gold-step-2", "l1-gold-takeoff"] }],
            platforms: [g("l1-gold-west", 11600, 13200), g("l1-gold-recovery", 13370, 14500),
                p("l1-gold-bypass", 11720, 365, 200, "enemy-bypass"), p("l1-gold-bridge", 12000, 300, 240, "enemy-bypass"),
                p("l1-gold-rest", 12350, 365, 150, "recovery"), p("l1-gold-step-1", 12600, 365, 180, "coin-route"),
                p("l1-gold-step-2", 12840, 295, 150, "coin-route"), p("l1-gold-takeoff", 13060, 335, 140, "coin-route"),
                p("l1-last-stomp", 13690, 365, 240, "stomp-opportunity")],
            enemies: [e("l1-gold-mushroom", "mushroom", 12100, 11950, 12300, "Guard the optional approach while leaving a raised bypass.", 80),
                e("l1-last-slime", "slime", 13910, 13850, 14100, "One final stomp choice after the coin recovery area.", 70)],
            coins: [{ id: "level-1-coin-3", x: 13285, y: 230, difficulty: "hard" }]
        },
        {
            id: "finish", start: 14500, end: 16000, difficulty: "easy-medium",
            title: "One Last Climb", hint: "Follow the clear steps to the flag.",
            purpose: "A readable final climb and safe finish, without another surprise enemy.",
            requiredRoute: ["l1-finish-step-1", "l1-finish-step-2", "l1-finish-step-3", "l1-finish-step-4", "l1-flag"], optionalRoutes: [],
            platforms: [g("l1-finish-ground", 14500, 16000), p("l1-finish-step-1", 14700, 365, 180, "required"),
                p("l1-finish-step-2", 14960, 295, 170, "required"), p("l1-finish-step-3", 15210, 260, 180, "required"),
                p("l1-finish-step-4", 15460, 260, 180, "required"), p("l1-flag", 15710, 260, 250, "finish")]
        }
    ]
});

