import { level2Scenery } from "./Level2Scenery.js";
import { defineLevel, ground as g, ledge as p, creature as e, thorns as h } from "./design/defineLevel.js";
const crumble = { type: "collapsing", collapseDelay: 1, appearance: "wood" };

export const level2 = defineLevel({
    id: 2, name: "The Winding Grove", theme: "forest", mapSummary: "Forest · Canopy paths and winding clearings",
    worldWidth: 18000, spawn: { x: 80, feetY: 460 }, scenery: level2Scenery, finishId: "l2-flag",
    stages: [
        {
            id: "introduction", start: 0, end: 2990, difficulty: "easy-medium", title: "The Winding Grove",
            hint: "Slimes can be stomped; mushrooms cannot. Try the lift after the upper bypass.",
            purpose: "Begin with familiar jumps, one isolated slime, then a mushroom bypass ending at a lift.",
            requiredRoute: ["l2-start", "l2-first-landing", "l2-intro-east"],
            optionalRoutes: [{ purpose: "Practice a short climb above safe ground before the first gap.", platforms: ["l2-practice-1", "l2-practice-2"] },
                { purpose: "Avoid the mushroom and ride the lift into Fern Walk.", platforms: ["l2-intro-bypass-1", "l2-intro-bypass-2", "l2-intro-bypass-exit", "l2-lift-approach", "grove-lift"] }],
            platforms: [g("l2-start", 0, 700), g("l2-first-landing", 830, 1680), g("l2-intro-east", 1840, 2820),
                p("l2-practice-1", 200, 365, 160, "practice"), p("l2-practice-2", 430, 295, 150, "practice"),
                p("l2-first-stomp", 980, 365, 180, "stomp-opportunity"),
                p("l2-intro-bypass-1", 1980, 365, 170, "enemy-bypass"), p("l2-intro-bypass-2", 2210, 295, 200, "enemy-bypass"),
                p("l2-intro-bypass-exit", 2480, 335, 160, "recovery"), p("l2-lift-approach", 2770, 330, 120, "lift-approach"),
                p("grove-lift", 2890, 375, 100, "alternate-crossing", { type: "moving", axis: "y", distance: -115, speed: 55, pause: 0.4, appearance: "wood" })],
            enemies: [e("l2-first-slime", "slime", 1250, 1120, 1450, "Teach a forest stomp with room after the first pit.", 80),
                e("l2-intro-mushroom", "mushroom", 2350, 2200, 2510, "A mushroom bypass that reconnects at the lift.", 85)],
            coins: [{ id: "level-2-coin-1", x: 520, y: 434, difficulty: "easy" }]
        },
        {
            id: "exploration", start: 2990, end: 6330, difficulty: "medium", title: "Fern Walk and Canopy Crossing",
            hint: "Cracks mean jump soon. A mushroom guards the optional canopy coin.",
            purpose: "Practice collapse above safe ground before the coin route asks for enemy timing.",
            requiredRoute: ["l2-fern-ground", "l2-canopy-ground"],
            optionalRoutes: [{ purpose: "Bypass thorns and learn collapse above safe ground.", platforms: ["l2-fern-1", "l2-fern-2", "l2-fern-3", "l2-fern-bridge", "grove-crumble-4030", "l2-fern-exit"] },
                { purpose: "Reach Coin 2 beyond the canopy mushroom, then return safely.", coinId: "level-2-coin-2", platforms: ["l2-canopy-1", "l2-canopy-2", "l2-canopy", "l2-canopy-exit", "l2-canopy-gap-step"] }],
            platforms: [g("l2-fern-ground", 2990, 4450), g("l2-canopy-ground", 4620, 6150),
                p("l2-fern-1", 3100, 365, 160, "stomp-opportunity"), p("l2-fern-2", 3340, 295, 180, "enemy-bypass"),
                p("l2-fern-3", 3590, 260, 180, "hazard-bypass"), p("l2-fern-bridge", 3810, 300, 160, "hazard-bypass"),
                p("grove-crumble-4030", 4030, 365, 160, "collapse-practice", crumble), p("l2-fern-exit", 4270, 335, 150, "recovery"),
                p("l2-canopy-1", 4700, 365, 150, "coin-route"), p("l2-canopy-2", 4910, 295, 140, "coin-route"),
                p("l2-canopy", 5120, 260, 480, "coin-route"), p("l2-canopy-exit", 5800, 335, 150, "recovery"),
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
            optionalRoutes: [{ purpose: "Bypass the mushroom and thorns, wait safely, then ride the ferry to the far bank.", platforms: ["l2-bend-1", "l2-bend-2", "l2-bend-3", "l2-bend-exit", "grove-ferry", "l2-shallow-1"] },
                { purpose: "Use shallow ledges to bypass or stomp the slime.", platforms: ["l2-shallow-1", "l2-shallow-2", "l2-shallow-3"] }],
            platforms: [g("l2-bend-west", 6330, 7700), g("l2-bend-east", 7880, 9300),
                p("l2-bend-1", 6400, 365, 170, "enemy-bypass"), p("l2-bend-2", 6640, 295, 180, "enemy-bypass"),
                p("l2-bend-3", 6880, 260, 200, "enemy-bypass"), p("l2-bend-exit", 7200, 365, 310, "ferry-dock"),
                p("grove-ferry", 7560, 335, 140, "gap-crossing", { type: "moving", axis: "x", distance: 210, speed: 70, pause: 0.3, appearance: "wood" }),
                p("l2-shallow-1", 8050, 365, 220, "stomp-opportunity"), p("l2-shallow-2", 8350, 335, 260, "enemy-bypass"),
                p("l2-shallow-3", 8720, 365, 180, "recovery"), p("l2-long-gap-step", 9220, 365, 80, "gap-assist")],
            enemies: [e("l2-bend-mushroom", "mushroom", 6740, 6590, 7250, "A long, visible avoidance patrol with a raised route.", 90),
                e("l2-bend-slime", "slime", 8400, 8200, 8850, "Offer stomps from low ledges, away from thorns.", 95)],
            hazards: [h("l2-bend-thorns", 7410, 45)]
        },
        {
            id: "combined", start: 9490, end: 12790, difficulty: "medium", title: "Root Hollow",
            hint: "Use the takeoff ledges for wider gaps. Recover between patrols and thorns.",
            purpose: "Combine known challenges, with raised takeoffs reducing the precision of wide gaps.",
            requiredRoute: ["l2-hollow-west", "l2-hollow-west-exit", "l2-hollow-east", "l2-hollow-east-exit"],
            optionalRoutes: [{ purpose: "Avoid the mushroom and thorn patch.", platforms: ["l2-hollow-1", "l2-hollow-2", "l2-hollow-3"] },
                { purpose: "Choose slime stomps or a shallow upper lane.", platforms: ["l2-root-1", "l2-root-2", "l2-root-3", "l2-root-thorns"] }],
            platforms: [g("l2-hollow-west", 9490, 10800), g("l2-hollow-east", 10980, 12600),
                p("l2-hollow-1", 9650, 365, 180, "enemy-bypass"), p("l2-hollow-2", 9910, 295, 200, "enemy-bypass"),
                p("l2-hollow-3", 10200, 335, 220, "hazard-approach"), p("l2-hollow-west-exit", 10610, 365, 140, "gap-assist"),
                p("l2-root-1", 11120, 365, 180, "stomp-opportunity"), p("l2-root-2", 11400, 335, 220, "enemy-bypass"),
                p("l2-root-3", 11720, 365, 240, "enemy-bypass"), p("l2-root-thorns", 12030, 335, 190, "hazard-bypass"),
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
            optionalRoutes: [{ purpose: "Avoid the sunbreak mushroom.", platforms: ["l2-sunbreak-1", "l2-sunbreak-2", "l2-sunbreak-3"] },
                { purpose: "Climb to the collapsing takeoff for Coin 3.", coinId: "level-2-coin-3", platforms: ["l2-sparrow-1", "l2-sparrow-2", "l2-gold-1", "l2-gold-2", "l2-gold-3", "grove-crumble-15750"] }],
            platforms: [g("l2-sunbreak", 12790, 14200), g("l2-sparrow-ground", 14390, 15750),
                p("l2-sunbreak-1", 13000, 365, 240, "enemy-bypass"), p("l2-sunbreak-2", 13320, 295, 300, "enemy-bypass"),
                p("l2-sunbreak-3", 13700, 335, 200, "recovery"), p("l2-sunbreak-exit", 14070, 365, 130, "gap-assist"),
                p("l2-sparrow-1", 14520, 365, 150, "stomp-opportunity"), p("l2-sparrow-2", 14740, 335, 180, "enemy-bypass"),
                p("l2-gold-1", 15140, 365, 130, "coin-route"), p("l2-gold-2", 15350, 295, 115, "coin-route"),
                p("l2-gold-3", 15560, 260, 110, "coin-route"), p("grove-crumble-15750", 15750, 300, 110, "coin-route", crumble)],
            enemies: [e("l2-sunbreak-mushroom", "mushroom", 13350, 13120, 13740, "Avoidance before the wide gap, with room to recover.", 90),
                e("l2-sparrow-slime", "slime", 14800, 14650, 14950, "Guard the approach, not the coin's landing clearing.", 95)],
            hazards: [h("l2-sunbreak-thorns", 13940, 50)],
            coins: [{ id: "level-2-coin-3", x: 15910, y: 190, difficulty: "hard" }]
        },
        {
            id: "finish", start: 15930, end: 18000, difficulty: "medium", title: "The Grove Lookout",
            hint: "One last familiar crossing, then follow the steps to the flag.",
            purpose: "Recover after Coin 3, bypass the final mushroom and thorns, and finish on clear steps.",
            requiredRoute: ["l2-lookout-ground", "l2-finish-1", "l2-finish-2", "l2-finish-3", "l2-flag"],
            optionalRoutes: [{ purpose: "Avoid the final ground patrol and thorn patch.", platforms: ["l2-lookout-1", "l2-lookout-2", "l2-lookout-3", "l2-lookout-thorns"] }],
            platforms: [g("l2-lookout-ground", 15930, 18000),
                p("l2-lookout-1", 16120, 365, 160, "enemy-bypass"), p("l2-lookout-2", 16350, 335, 240, "enemy-bypass"),
                p("l2-lookout-3", 16700, 365, 160, "recovery"), p("l2-lookout-thorns", 16910, 335, 200, "hazard-bypass"),
                p("l2-finish-1", 17300, 365, 140, "required"), p("l2-finish-2", 17520, 295, 125, "required"),
                p("l2-finish-3", 17740, 260, 110, "required"), p("l2-flag", 17880, 260, 120, "finish")],
            enemies: [e("l2-lookout-mushroom", "mushroom", 16450, 16340, 16920, "A final familiar avoidance pattern before a safe finish.", 95)],
            hazards: [h("l2-lookout-thorns-hazard", 17040, 45)]
        }
    ]
});

