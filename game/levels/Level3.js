import { level3Scenery } from "./Level3Scenery.js";
import { defineLevel, ground as g, ledge as p, creature as e, thorns as h } from "./design/defineLevel.js";
const bank = (id, x, end, y) => ({ ...g(id, x, end), y, height: 540 - y, terrain: true });
const wood = { appearance: "wood" };
const crumble = { type: "collapsing", collapseDelay: 1.1, ...wood };

// Authored routes use the existing 280 speed / 650 jump. Safe lower lanes reconnect
// with optional branch routes; decorative trunks never create collision surfaces.
export const level3 = defineLevel({
    id: 3, name: "Deep Forest", theme: "deep-forest", worldWidth: 14000,
    mapSummary: "Deep Forest · Tree lifts, hidden boughs and woodland bridges",
    audio: { music: "deepForest" }, spawn: { x: 80, feetY: 460 },
    scenery: level3Scenery, finishId: "l3-flag",
    landscape: { forest: [
        [-120,180],[90,225],[230,200],[590,240],[760,205],[1100,230],[1250,190],
        [1630,245],[1800,210],[2170,235],[2330,200],[2710,250],[2880,220],[3250,240],
        [3410,195],[3800,235],[3970,210],[4350,245],[4520,200],[4890,235],[5050,190],
        [5430,230],[5590,210],[5970,225],[6150,185],[6520,205],[6890,175],[7280,190]
    ] },
    explorationAreas: [
        {
            id: "l3-hidden-bough", title: "The Hidden Bough", kind: "elevated",
            purpose: "Climb the tree branches, time the mushroom and find gold beyond its patrol, then drop to the meadow.",
            clue: "Cream flowers and the bright edge of a branch continue behind a few leaves.",
            bounds: { x: 3200, y: 160, width: 380, height: 124 },
            entrance: { x: 2630, y: 396, width: 60, height: 64 },
            exit: { x: 3820, y: 396, width: 60, height: 64 },
            platformIds: ["l3-branch-1", "l3-branch-2", "l3-bough", "l3-branch-exit"],
            discoveryPlatforms: ["l3-bough"], coinId: "level-3-coin-2",
            foreground: [{ organic: true, kind: "leaves", x: 3380, y: 238, width: 115, height: 46 }]
        },
        {
            id: "l3-fern-passage", title: "Fern Passage", kind: "passage",
            purpose: "Follow the low shelf behind the bushes to bypass the thorn patch, then reconnect before the ferry section.",
            clue: "A small break in the hedge and cream flowers expose the shelf's grassy edge.",
            bounds: { x: 4450, y: 290, width: 180, height: 75 },
            entrance: { x: 4250, y: 396, width: 60, height: 64 },
            exit: { x: 4970, y: 396, width: 60, height: 64 },
            platformIds: ["l3-passage-entry", "l3-passage-shelf", "l3-passage-exit"],
            discoveryPlatforms: ["l3-passage-shelf"],
            foreground: [{ organic: true, kind: "roots", x: 4460, y: 310, width: 150, height: 65 }]
        },
        {
            id: "l3-last-nest", title: "The Last Nest", kind: "challenge",
            purpose: "Ride the swaying bough, leave the cracked bridge for the final coin, and return to the clearing.",
            clue: "A gold glint and a cracked wooden ledge are visible between the canopy leaves.",
            bounds: { x: 11280, y: 200, width: 280, height: 124 },
            entrance: { x: 10580, y: 396, width: 60, height: 64 },
            exit: { x: 12000, y: 396, width: 60, height: 64 },
            platformIds: ["l3-nest-step-1", "l3-nest-step-2", "l3-nest-bough", "l3-nest-crumble", "l3-nest-exit"],
            discoveryPlatforms: ["l3-nest-crumble"], coinId: "level-3-coin-3",
            foreground: [{ organic: true, kind: "leaves", x: 11370, y: 268, width: 100, height: 44 }]
        }
    ],
    stages: [
        {
            id: "entrance", start: 0, end: 2400, difficulty: "easy-medium",
            title: "Among the Roots", hint: "Cross onto the high root. The tree bough holds gold; a lower route continues beneath it.",
            purpose: "Climb across a visible root gap, choose the high bough or sheltered lower floor, then read a slime patrol before the exit crossing.",
            requiredRoute: ["l3-start", "l3-root-bank", "l3-root-slope", "l3-entrance-east", "l3-entrance-return"],
            optionalRoutes: [{ purpose: "Jump from the high root onto the supported bough for gold, then drop safely beyond the lower patrol approach.",
                coinId: "level-3-coin-1", platforms: ["l3-intro-branch-1"] }],
            platforms: [bank("l3-start", 0, 500, 460), bank("l3-root-bank", 620, 900, 390),
                bank("l3-root-slope", 900, 1220, 430), bank("l3-entrance-east", 1220, 1700, 460),
                bank("l3-entrance-return", 1840, 2260, 430),
                p("l3-intro-branch-1", 1000, 300, 320, "root-bough-coin", wood)],
            enemies: [e("l3-entrance-slime", "slime", 1440, 1380, 1460, "A visible lower patrol after the root descent; the bough gives an optional approach from above.", 80)],
            coins: [{ id: "level-3-coin-1", x: 1180, y: 270, difficulty: "easy" }]
        },
        {
            id: "branching", start: 2400, end: 5400, difficulty: "medium",
            title: "Branching Forest Paths", hint: "The meadow continues below. Look for gold between the higher branches.",
            purpose: "Choose the simpler lower path or an elevated mushroom-and-coin route, then discover a sheltered lower passage.",
            requiredRoute: ["l3-branch-meadow", "l3-passage-ground"],
            optionalRoutes: [
                { purpose: "Climb to the optional canopy coin and reconnect before the gap.", coinId: "level-3-coin-2", platforms: ["l3-branch-1", "l3-branch-2", "l3-bough", "l3-branch-exit"] },
                { purpose: "Find the low fern passage beneath the high tree branch.", platforms: ["l3-passage-entry", "l3-passage-shelf", "l3-passage-exit"] }
            ],
            platforms: [g("l3-branch-meadow", 2400, 3920), g("l3-passage-ground", 4070, 5240),
                p("l3-branch-1", 2700, 365, 170, "coin-route"), p("l3-branch-2", 2940, 295, 170, "coin-route"),
                p("l3-bough", 3200, 260, 380, "coin-route"), p("l3-branch-exit", 3740, 335, 160, "recovery"),
                p("l3-passage-entry", 4260, 365, 140, "secret-connector"), p("l3-passage-shelf", 4450, 365, 180, "secret-connector"),
                p("l3-passage-exit", 4740, 335, 160, "recovery")],
            enemies: [e("l3-meadow-slime", "slime", 3040, 3000, 3400, "A lower-lane stomp choice; the upper route bypasses this patrol.", 85),
                e("l3-bough-mushroom", "mushroom", 3250, 3220, 3310, "A short visible patrol leaves a wide safe landing beside the optional coin.", 48, 260)],
            hazards: [h("l3-passage-thorns", 4590, 30)],
            coins: [{ id: "level-3-coin-2", x: 3490, y: 230, difficulty: "medium" }]
        },
        {
            id: "canopy", start: 5400, end: 8500, difficulty: "medium",
            title: "Moving Canopy", hint: "Wait on the dock for the ferry. The wooden tree lift reaches the branch across the root ravine.",
            purpose: "Introduce a useful ferry over a broad stream, then a tree lift to the branch spanning a real root ravine.",
            requiredRoute: ["l3-stream-west", "l3-stream-step", "l3-stream-dock", "l3-ferry", "l3-ferry-exit", "l3-stream-east",
                "l3-lift-step", "l3-tree-lift", "l3-lift-bough", "l3-lift-return", "l3-stream-exit"],
            optionalRoutes: [], // Ferry and tree lift are actual main-route crossings here.
            platforms: [g("l3-stream-west", 5400, 6500), g("l3-stream-east", 6720, 7740), g("l3-lift-return", 8060, 8300),
                p("l3-stream-step", 5980, 365, 170, "ferry-approach"), p("l3-stream-dock", 6220, 335, 200, "ferry-dock", wood),
                p("l3-ferry", 6460, 335, 140, "gap-crossing", { type: "moving", axis: "x", distance: 200, speed: 65, pause: .4, ...wood, connection: { from: "l3-stream-dock", to: "l3-ferry-exit" } }),
                p("l3-ferry-exit", 6880, 335, 180, "recovery", wood), p("l3-lift-step", 7400, 365, 140, "lift-approach"),
                p("l3-tree-lift", 7600, 365, 120, "canopy-lift", { type: "moving", axis: "y", distance: -105, speed: 50, pause: .45, ...wood, connection: { from: "l3-lift-step", to: "l3-lift-bough" } }),
                p("l3-lift-bough", 7800, 260, 220, "hazard-bypass"),
                p("l3-stream-exit", 8110, 365, 190, "recovery-and-gap-assist")],
            enemies: [e("l3-stream-slime", "slime", 7100, 7040, 7300, "Leave the ferry landing clear before a familiar ground patrol.", 90)],
            hazards: [h("l3-lift-thorns", 8080, 40)]
        },
        {
            id: "challenge", start: 8500, end: 11800, difficulty: "medium-hard",
            title: "Heart of the Forest", hint: "Read the patrols, then choose the cracked upper route for the last gold coin.",
            purpose: "Combine familiar avoidance, a clearly visible cracked bridge over a gap, and an optional swaying-bough coin challenge.",
            requiredRoute: ["l3-heart-west", "l3-heart-crossing", "l3-heart-crumble", "l3-heart-landing", "l3-heart-east", "l3-nest-return"],
            optionalRoutes: [
                { purpose: "Avoid the mushroom on broad branch steps, then jump from a cracked bridge.", platforms: ["l3-heart-step-1", "l3-heart-step-2", "l3-heart-crossing", "l3-heart-crumble", "l3-heart-landing"] },
                { purpose: "Find gold beyond the moving bough and leave the collapsing ledge in time.", coinId: "level-3-coin-3", platforms: ["l3-nest-step-1", "l3-nest-step-2", "l3-nest-bough", "l3-nest-crumble", "l3-nest-exit"] }
            ],
            platforms: [g("l3-heart-west", 8500, 9700), g("l3-heart-east", 10000, 11300), g("l3-nest-return", 11440, 11640),
                p("l3-heart-step-1", 8660, 365, 170, "enemy-bypass"), p("l3-heart-step-2", 8900, 335, 480, "enemy-bypass"),
                p("l3-heart-crossing", 9440, 365, 130, "gap-assist", wood),
                p("l3-heart-crumble", 9750, 365, 150, "timed-crossing", { ...crumble, connection: { from: "l3-heart-crossing", to: "l3-heart-landing" } }), p("l3-heart-landing", 10000, 365, 200, "recovery"),
                p("l3-nest-step-1", 10600, 365, 160, "coin-route"), p("l3-nest-step-2", 10830, 295, 140, "coin-route"),
                p("l3-nest-bough", 11030, 260, 110, "coin-route", { type: "moving", axis: "x", distance: 80, speed: 40, pause: .4, ...wood, connection: { from: "l3-nest-step-2", to: "l3-nest-crumble" } }),
                p("l3-nest-crumble", 11300, 300, 140, "coin-route", { ...crumble, connection: { from: "l3-nest-bough", to: "l3-nest-exit" } }), p("l3-nest-exit", 11540, 335, 100, "gap-assist")],
            enemies: [e("l3-heart-mushroom", "mushroom", 9050, 8900, 9280, "One long avoidance patrol below a generous branch route.", 85),
                e("l3-nest-slime", "slime", 10400, 10280, 10530, "A stomp opportunity well before the optional nest climb.", 90)],
            hazards: [h("l3-nest-thorns", 10800, 40)],
            coins: [{ id: "level-3-coin-3", x: 11490, y: 220, difficulty: "hard" }]
        },
        {
            id: "clearing", start: 11800, end: 14000, difficulty: "medium",
            title: "Final Forest Clearing", hint: "Take a breath. One familiar gap, then open ground to the flag.",
            purpose: "Return to light open scenery, cross a final readable gap and finish on safe solid ground.",
            requiredRoute: ["l3-clearing", "l3-flag"],
            optionalRoutes: [{ purpose: "Use the broad takeoff branch to make the final gap more forgiving.", platforms: ["l3-clearing-takeoff"] }],
            platforms: [g("l3-clearing", 11800, 12600), g("l3-flag", 12740, 14000),
                p("l3-clearing-takeoff", 12380, 365, 160, "gap-assist")]
        }
    ]
});
