import { level2Scenery } from "./Level2Scenery.js";
import { defineLevel, ground as g, ledge as p, creature as e, thorns as h } from "./design/defineLevel.js";
const crumble = { type: "collapsing", collapseDelay: 1, appearance: "wood" };

// Course pass: reward the opening detour, keep bypasses over actual danger,
// and drop back to ground instead of adding an empty recovery staircase.
export const level2 = defineLevel({
    id: 2, name: "The Winding Grove", theme: "forest", mapSummary: "Forest · Canopy paths and winding clearings",
    worldWidth: 18000, audio: { music: "forest" }, spawn: { x: 80, feetY: 460 }, scenery: level2Scenery, finishId: "l2-flag",
    explorationAreas: [
        {
            id: "l2-leafy-canopy", title: "Leafy Canopy", kind: "elevated",
            purpose: "Climb above the lower slime, time the canopy mushroom, collect gold and ride a small bough across to the exit.",
            clue: "A visible gold silhouette and shelf edges continue behind light foliage.",
            bounds: { x: 5120, y: 160, width: 480, height: 124 },
            entrance: { x: 4625, y: 396, width: 60, height: 64 },
            exit: { x: 5960, y: 396, width: 50, height: 64 },
            platformIds: ["l2-canopy-1", "l2-canopy-2", "l2-canopy", "grove-canopy-bough", "l2-canopy-exit"],
            discoveryPlatforms: ["l2-canopy"], coinId: "level-2-coin-2",
            foreground: [{ kind: "leaves", x: 5140, y: 235, width: 160, height: 50 }]
        },
        {
            id: "l2-ferry-branch", title: "The Winding Crossing", kind: "alternate",
            purpose: "Choose an upper ferry crossing after the thorn bypass or use the lower main-route jump; reconnect before the next slime.",
            clue: "The dock edge and a moving wooden bough remain visible through the leaves.",
            bounds: { x: 7560, y: 245, width: 350, height: 114 },
            entrance: { x: 7300, y: 301, width: 60, height: 64 },
            exit: { x: 7940, y: 396, width: 60, height: 64 },
            platformIds: ["l2-bend-exit", "grove-ferry", "l2-shallow-1"], discoveryPlatforms: ["grove-ferry"],
            foreground: [{ kind: "leaves", x: 7420, y: 340, width: 80, height: 42 }]
        },
        {
            id: "l2-root-gallery", title: "Root Gallery", kind: "passage",
            purpose: "Use the sheltered lower shelf to bypass the root thorns, climb to gold, then leave the collapsing takeoff before it falls.",
            clue: "Cream flowers lead to a gap beneath a curved root and the visible edge of a grassy shelf.",
            bounds: { x: 15540, y: 290, width: 140, height: 75 },
            entrance: { x: 15460, y: 396, width: 60, height: 64 },
            exit: { x: 16020, y: 396, width: 60, height: 64 },
            platformIds: ["l2-root-gallery-shelf", "l2-gold-3", "grove-crumble-15750"],
            discoveryPlatforms: ["l2-root-gallery-shelf"], coinId: "level-2-coin-3",
            foreground: [{ kind: "roots", x: 15540, y: 309, width: 140, height: 70 }]
        }
    ],
    stages: [
        {
            id: "introduction", start: 0, end: 2990, difficulty: "easy-medium", title: "The Winding Grove",
            hint: "Slimes can be stomped; mushrooms cannot. Try the lift after the upper bypass.",
            purpose: "Begin with familiar jumps, one isolated slime, then a mushroom bypass ending at a lift.",
            requiredRoute: ["l2-start", "l2-first-landing", "l2-intro-east"],
            optionalRoutes: [{ purpose: "Take one jump to the easy coin, then return to the main path.", platforms: ["l2-practice-1"] },
                { purpose: "Avoid the mushroom and ride the lift into Fern Walk.", platforms: ["l2-intro-bypass-1", "l2-intro-bypass-2", "l2-intro-bypass-exit", "l2-lift-approach", "grove-lift"] }],
            platforms: [g("l2-start", 0, 700), g("l2-first-landing", 830, 1680), g("l2-intro-east", 1840, 2820),
                p("l2-practice-1", 200, 365, 160, "easy-coin-detour"), p("l2-first-stomp", 980, 365, 180, "stomp-opportunity"),
                p("l2-intro-bypass-1", 1980, 365, 170, "enemy-bypass"), p("l2-intro-bypass-2", 2210, 295, 200, "enemy-bypass"),
                p("l2-intro-bypass-exit", 2480, 335, 160, "recovery"), p("l2-lift-approach", 2770, 330, 120, "lift-approach"),
                p("grove-lift", 2890, 375, 100, "alternate-crossing", { type: "moving", axis: "y", distance: -115, speed: 55, pause: 0.4, appearance: "wood" })],
            enemies: [e("l2-first-slime", "slime", 1250, 1120, 1450, "Teach a forest stomp with room after the first pit.", 80),
                e("l2-intro-mushroom", "mushroom", 2350, 2200, 2510, "A mushroom bypass that reconnects at the lift.", 85)],
            coins: [{ id: "level-2-coin-1", x: 280, y: 335, difficulty: "easy" }]
        },
        {
            id: "exploration", start: 2990, end: 6330, difficulty: "medium", title: "Fern Walk and Canopy Crossing",
            hint: "Cracks mean jump soon. A mushroom guards the optional canopy coin.",
            purpose: "A low bypass leads past a patrol and thorns to a cracked bridge across a real gap, then reconnects before the coin route.",
            requiredRoute: ["l2-fern-ground", "l2-fern-return", "l2-canopy-ground"],
            optionalRoutes: [{ purpose: "Follow the low patrol bypass, cross the thorns, then leave the cracked bridge before it drops.", platforms: ["l2-fern-1", "l2-fern-2", "l2-fern-bridge", "grove-crumble-4030", "l2-fern-exit"] },
                { purpose: "Reach Coin 2 beyond the canopy mushroom, then ride or jump across the upper exit.", coinId: "level-2-coin-2", platforms: ["l2-canopy-1", "l2-canopy-2", "l2-canopy", "grove-canopy-bough", "l2-canopy-exit", "l2-canopy-gap-step"] }],
            platforms: [g("l2-fern-ground", 2990, 4030), g("l2-fern-return", 4190, 4450), g("l2-canopy-ground", 4620, 6150),
                p("l2-fern-1", 3100, 365, 160, "stomp-opportunity"), p("l2-fern-2", 3340, 335, 280, "enemy-bypass"),
                p("l2-fern-bridge", 3710, 335, 260, "hazard-bypass"),
                p("grove-crumble-4030", 4030, 365, 160, "timed-crossing", crumble), p("l2-fern-exit", 4270, 335, 150, "recovery"),
                p("l2-canopy-1", 4700, 365, 150, "coin-route"), p("l2-canopy-2", 4910, 295, 140, "coin-route"),
                p("l2-canopy", 5120, 260, 480, "coin-route"), p("l2-canopy-exit", 5800, 335, 150, "recovery"),
                p("grove-canopy-bough", 5620, 300, 100, "canopy-connector", { type: "moving", axis: "x", distance: 70, speed: 40, pause: 0.35, appearance: "wood" }),
                p("l2-canopy-gap-step", 6020, 365, 130, "gap-assist")],
            enemies: [e("l2-fern-slime", "slime", 3440, 3200, 3700, "A raised bypass or a ground stomp before the thorns.", 80),
                e("l2-canopy-slime", "slime", 4840, 4770, 5460, "A lower-route challenge with an elevated alternative.", 90),
                e("l2-canopy-guard", "mushroom", 5330, 5190, 5460, "Guard the optional medium coin with a generous landing beyond the patrol.", 55, 260)],
            hazards: [h("l2-fern-thorns", 3880, 45)],
            coins: [{ id: "level-2-coin-2", x: 5540, y: 230, difficulty: "medium" }]
        },
        {
            id: "challenge", start: 6330, end: 9490, difficulty: "medium", title: "Mushroom Bend",
            hint: "Wait on the grassy dock, then ride the ferry across the gap. The lower jump is still available.",
            purpose: "Build from mushroom avoidance into a safe waiting dock and a useful ferry crossing, then recover before the slime.",
            requiredRoute: ["l2-bend-west", "l2-bend-east", "l2-long-gap-step"],
            optionalRoutes: [{ purpose: "Bypass the mushroom and thorns, wait safely, then ride the ferry to the far bank.", platforms: ["l2-bend-1", "l2-bend-2", "l2-bend-exit", "grove-ferry", "l2-shallow-1"] },
                { purpose: "Use shallow ledges to bypass or stomp the slime.", platforms: ["l2-shallow-1", "l2-shallow-2"] }],
            platforms: [g("l2-bend-west", 6330, 7700), g("l2-bend-east", 7880, 9300),
                p("l2-bend-1", 6400, 365, 170, "enemy-bypass"), p("l2-bend-2", 6640, 335, 440, "enemy-bypass"),
                p("l2-bend-exit", 7200, 365, 310, "ferry-dock"),
                p("grove-ferry", 7560, 335, 140, "gap-crossing", { type: "moving", axis: "x", distance: 210, speed: 70, pause: 0.3, appearance: "wood" }),
                p("l2-shallow-1", 8050, 365, 220, "stomp-opportunity"), p("l2-shallow-2", 8350, 365, 550, "enemy-bypass"),
                p("l2-long-gap-step", 9040, 365, 260, "gap-assist")],
            enemies: [e("l2-bend-mushroom", "mushroom", 6740, 6590, 7250, "A long, visible avoidance patrol with a raised route.", 90),
                e("l2-bend-slime", "slime", 8400, 8200, 8850, "Offer stomps from low ledges, away from thorns.", 95)],
            hazards: [h("l2-bend-thorns", 7410, 45)]
        },
        {
            id: "combined", start: 9490, end: 12790, difficulty: "medium", title: "Root Hollow",
            hint: "Use the takeoff ledges for wider gaps. Recover between patrols and thorns.",
            purpose: "Combine known challenges, with raised takeoffs reducing the precision of wide gaps.",
            requiredRoute: ["l2-hollow-west", "l2-hollow-west-exit", "l2-hollow-east", "l2-hollow-east-exit"],
            optionalRoutes: [{ purpose: "Avoid the mushroom and thorn patch.", platforms: ["l2-hollow-1", "l2-hollow-2"] },
                { purpose: "Choose slime stomps or a shallow upper lane.", platforms: ["l2-root-1", "l2-root-2", "l2-root-thorns"] }],
            platforms: [g("l2-hollow-west", 9490, 10800), g("l2-hollow-east", 10980, 12600),
                p("l2-hollow-1", 9650, 365, 180, "enemy-bypass"), p("l2-hollow-2", 9930, 335, 610, "enemy-bypass"),
                p("l2-hollow-west-exit", 10610, 365, 140, "gap-assist"),
                p("l2-root-1", 11120, 365, 180, "stomp-opportunity"), p("l2-root-2", 11400, 365, 600, "enemy-bypass"),
                p("l2-root-thorns", 12080, 335, 170, "hazard-bypass"),
                p("l2-hollow-east-exit", 12430, 365, 140, "gap-assist")],
            enemies: [e("l2-hollow-mushroom", "mushroom", 10000, 9860, 10280, "Guard a lower lane before a separate thorn jump.", 90),
                e("l2-root-slime", "slime", 11600, 11390, 11960, "Reward controlled stomps from the shallow ledges.", 95)],
            hazards: [h("l2-hollow-thorns", 10430, 50), h("l2-root-thorns-hazard", 12180, 45)]
        },
        {
            id: "final-challenge", start: 12790, end: 15930, difficulty: "medium-hard", title: "Sparrow Ledges",
            hint: "The last coin is optional. Leave the cracked takeoff ledge before it drops.",
            purpose: "Combine avoidance and a timed coin takeoff, with an empty landing clearing afterward.",
            requiredRoute: ["l2-sunbreak", "l2-sunbreak-exit", "l2-sparrow-ground"],
            optionalRoutes: [{ purpose: "Avoid the sunbreak mushroom.", platforms: ["l2-sunbreak-1", "l2-sunbreak-2"] },
                { purpose: "Climb to the collapsing takeoff for Coin 3.", coinId: "level-2-coin-3", platforms: ["l2-sparrow-1", "l2-sparrow-2", "l2-gold-1", "l2-gold-2", "l2-gold-3", "grove-crumble-15750"] },
                { purpose: "Discover a sheltered lower approach to the final gold route.", coinId: "level-2-coin-3", platforms: ["l2-root-gallery-shelf", "l2-gold-3", "grove-crumble-15750"] }],
            platforms: [g("l2-sunbreak", 12790, 14200), g("l2-sparrow-ground", 14390, 15750),
                p("l2-sunbreak-1", 13000, 365, 240, "enemy-bypass"), p("l2-sunbreak-2", 13320, 335, 580, "enemy-bypass"),
                p("l2-sunbreak-exit", 14070, 365, 130, "gap-assist"),
                p("l2-sparrow-1", 14520, 365, 150, "stomp-opportunity"), p("l2-sparrow-2", 14740, 335, 180, "enemy-bypass"),
                p("l2-gold-1", 15140, 365, 130, "coin-route"), p("l2-gold-2", 15350, 295, 115, "coin-route"),
                p("l2-gold-3", 15560, 260, 110, "coin-route"), p("l2-root-gallery-shelf", 15540, 365, 140, "secret-connector"),
                p("grove-crumble-15750", 15750, 300, 110, "coin-route", crumble)],
            enemies: [e("l2-sunbreak-mushroom", "mushroom", 13350, 13120, 13740, "Avoidance before the wide gap, with room to recover.", 90),
                e("l2-sparrow-slime", "slime", 14800, 14650, 14950, "Guard the approach, not the coin's landing clearing.", 95)],
            hazards: [h("l2-sunbreak-thorns", 13940, 50), h("l2-gallery-thorns", 15580, 40)],
            coins: [{ id: "level-2-coin-3", x: 15910, y: 190, difficulty: "hard" }]
        },
        {
            id: "finish", start: 15930, end: 18000, difficulty: "medium", title: "The Grove Lookout",
            hint: "One last familiar crossing, then follow the steps to the flag.",
            purpose: "Recover after Coin 3, bypass the final mushroom and thorns, and finish on clear steps.",
            requiredRoute: ["l2-lookout-ground", "l2-finish-1", "l2-finish-2", "l2-finish-3", "l2-flag"],
            optionalRoutes: [{ purpose: "Avoid the final ground patrol and thorn patch.", platforms: ["l2-lookout-1", "l2-lookout-2"] }],
            platforms: [g("l2-lookout-ground", 15930, 18000),
                p("l2-lookout-1", 16120, 365, 160, "enemy-bypass"), p("l2-lookout-2", 16350, 335, 780, "enemy-bypass"),
                p("l2-finish-1", 17300, 365, 140, "required"), p("l2-finish-2", 17520, 295, 125, "required"),
                p("l2-finish-3", 17740, 260, 110, "required"), p("l2-flag", 17880, 260, 120, "finish")],
            enemies: [e("l2-lookout-mushroom", "mushroom", 16450, 16340, 16920, "A final familiar avoidance pattern before a safe finish.", 95)],
            hazards: [h("l2-lookout-thorns-hazard", 17040, 45)]
        }
    ]
});

