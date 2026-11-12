import { level1Scenery } from "./Level1Scenery.js";
import { defineLevel, ground as g, ledge as p, creature as e, thorns as h } from "./design/defineLevel.js";

// The opening uses solid-looking earth silhouettes with the existing one-way
// landing surfaces. Adjacent terraces only descend; climbs occur across visible
// pits, avoiding an unsupported change to side-wall/slope physics.
const bank = (id, x, end, y) => ({ ...g(id, x, end), y, height: 540 - y, terrain: true });
export const level1 = defineLevel({
    id: 1, name: "The First Adventure", worldWidth: 16000, audio: { music: "grassland" },
    spawn: { x: 80, feetY: 365 }, scenery: level1Scenery, finishId: "l1-flag",
    openingLandscape: {
        end: 2040, fadeStart: 1100,
        clouds: [{ x: 270, y: 145, scale: 1 }, { x: 760, y: 175, scale: .7 }, { x: 1240, y: 125, scale: .85 }]
    },
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
            purpose: "A sheltered low shelf bypasses the clover thorns, then drops safely back to the meadow.",
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
            title: "The Old Oak", hint: "Follow the dell or jump to the oak's gold. Watch the slime from the raised bank.",
            purpose: "Descend into the dell, choose the supported oak overlook, jump to an observation bank, then read one slime patrol before the exit gap.",
            requiredRoute: ["l1-start", "l1-descent-bank", "l1-dell", "l1-first-landing", "l1-slime-dell", "l1-exit-bank"],
            optionalRoutes: [{ purpose: "Jump from the hilltop to the oak overlook for gold, then drop into the dell with room to prepare for the pit.",
                coinId: "level-1-coin-1", platforms: ["l1-practice-1"] }],
            platforms: [bank("l1-start", 0, 280, 365), bank("l1-descent-bank", 280, 550, 410),
                bank("l1-dell", 550, 900, 460), bank("l1-first-landing", 1020, 1280, 420),
                bank("l1-slime-dell", 1280, 1690, 460), bank("l1-exit-bank", 1830, 2040, 430),
                p("l1-practice-1", 390, 310, 220, "oak-overlook")],
            enemies: [e("l1-first-slime", "slime", 1440, 1380, 1480,
                "Observe from the raised bank, then stomp or jump over one patrol; recover before the separate exit pit.", 60)],
            coins: [{ id: "level-1-coin-1", x: 555, y: 280, difficulty: "easy" }]
        },
        {
            id: "exploration", start: 2040, end: 5200, difficulty: "easy",
            title: "Meadow Choices", hint: "The upper path avoids mushrooms. Look for gold above the meadow.",
            purpose: "Choose a mushroom bypass, recover, then explore a distinct coin branch.",
            requiredRoute: ["l1-meadow", "l1-coin-meadow"],
            optionalRoutes: [
                { purpose: "Avoid the first mushroom rather than attack it.", platforms: ["l1-bypass-1"] },
                { purpose: "Collect the medium coin and reconnect to the main path.", coinId: "level-1-coin-2", platforms: ["l1-coin-step-1", "l1-coin-step-2", "l1-coin-perch", "l1-coin-exit"] },
                { purpose: "Use the low shelf to bypass the thorn patch without taking the high coin route.", platforms: ["l1-clover-shelf", "l1-coin-exit"] }
            ],
            platforms: [g("l1-meadow", 2040, 3650), g("l1-coin-meadow", 3790, 5060),
                p("l1-bypass-1", 2250, 365, 500, "enemy-bypass"),
                p("l1-coin-step-1", 3900, 365, 170, "coin-route"), p("l1-coin-step-2", 4140, 295, 160, "coin-route"),
                p("l1-coin-perch", 4380, 260, 240, "coin-route"), p("l1-clover-shelf", 4430, 365, 160, "secret-connector"),
                p("l1-coin-exit", 4740, 335, 180, "recovery")],
            enemies: [e("l1-first-mushroom", "mushroom", 2620, 2530, 2700, "A slower mushroom beneath the far half of one continuous low bypass.", 60),
                e("l1-coin-slime", "slime", 4100, 4010, 4290, "Guard the lower route, leaving the upper coin perch clear.", 70)],
            hazards: [h("l1-clover-thorns", 4550, 30)],
            coins: [{ id: "level-1-coin-2", x: 4500, y: 230, difficulty: "medium" }]
        },
        {
            id: "challenge", start: 5200, end: 8200, difficulty: "easy-medium",
            title: "Rolling Ridge", hint: "Jump the thorns or take the raised crossing.",
            purpose: "Practice enemies and thorns in separate encounters with safe recovery space.",
            requiredRoute: ["l1-thorn-field", "l1-mushroom-field"],
            optionalRoutes: [{ purpose: "Cross above thorns.", platforms: ["l1-thorn-approach", "l1-thorn-bridge"] },
                { purpose: "Bypass a mushroom with a shallow climb.", platforms: ["l1-mushroom-step", "l1-mushroom-bridge"] }],
            platforms: [g("l1-thorn-field", 5200, 6500), g("l1-mushroom-field", 6650, 8050),
                p("l1-thorn-approach", 5590, 365, 180, "stomp-opportunity"), p("l1-thorn-bridge", 5840, 300, 240, "hazard-bypass"),
                p("l1-mushroom-step", 6870, 365, 200, "enemy-bypass"),
                p("l1-mushroom-bridge", 7130, 335, 300, "enemy-bypass")],
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
                { purpose: "Avoid the mushroom on the upper lane.", platforms: ["l1-east-step", "l1-east-bridge"] }],
            platforms: [g("l1-sunlit-west", 8200, 9600), g("l1-sunlit-east", 9760, 11440),
                p("l1-sunlit-stomp", 8430, 365, 190, "stomp-opportunity"), p("l1-sunlit-hop", 9010, 365, 220, "hazard-bypass"),
                p("l1-east-step", 10020, 365, 200, "enemy-bypass"), p("l1-east-bridge", 10280, 335, 420, "enemy-bypass")],
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
                platforms: ["l1-gold-bypass", "l1-gold-bridge", "l1-gold-step-1", "l1-gold-step-2", "l1-gold-takeoff"] }],
            platforms: [g("l1-gold-west", 11600, 13200), g("l1-gold-recovery", 13370, 14500),
                p("l1-gold-bypass", 11720, 365, 200, "enemy-bypass"), p("l1-gold-bridge", 12000, 335, 350, "enemy-bypass"),
                p("l1-gold-step-1", 12600, 365, 180, "coin-route"),
                p("l1-gold-step-2", 12840, 295, 150, "coin-route"), p("l1-gold-takeoff", 13060, 335, 140, "coin-route")],
            enemies: [e("l1-gold-mushroom", "mushroom", 12100, 11950, 12300, "Guard the optional approach while leaving a raised bypass.", 80),
                e("l1-last-slime", "slime", 13910, 13850, 14100, "One final stomp choice after the coin recovery area.", 70)],
            coins: [{ id: "level-1-coin-3", x: 13285, y: 230, difficulty: "hard" }]
        },
        {
            id: "finish", start: 14500, end: 16000, difficulty: "easy-medium",
            title: "One Last Climb", hint: "Follow the clear steps to the flag.",
            purpose: "Jump the clearly visible entrance gap, then follow a readable final climb to a safe finish.",
            requiredRoute: ["l1-finish-step-1", "l1-finish-step-2", "l1-finish-step-3", "l1-finish-step-4", "l1-flag"], optionalRoutes: [],
            // A real 140px pit at the old ground seam; no hidden floor beneath it.
            platforms: [g("l1-finish-ground", 14640, 16000), p("l1-finish-step-1", 14700, 365, 180, "required"),
                p("l1-finish-step-2", 14960, 295, 170, "required"), p("l1-finish-step-3", 15210, 260, 180, "required"),
                p("l1-finish-step-4", 15460, 260, 180, "required"), p("l1-flag", 15710, 260, 250, "finish")]
        }
    ]
});

