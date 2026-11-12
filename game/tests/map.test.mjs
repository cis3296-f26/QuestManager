import test from "node:test";
import assert from "node:assert/strict";
import { WorldMap } from "../ui/WorldMap.js";
import { levels } from "../levels/levels.js";

function fixture(hash = "") {
    const previous = { document: globalThis.document, window: globalThis.window, location: globalThis.location };
    const element = () => ({ children: [], listeners: {}, attributes: {},
        classList: { add() {}, toggle() {} },
        replaceChildren(...children) { this.children = children; },
        appendChild(child) { this.children.push(child); },
        setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(key, callback) { this.listeners[key] = callback; },
        focus() { this.focused = true; },
        querySelector() { return null; },
        showModal() { this.open = true; }, close() { this.open = false; }
    });
    const elements = Object.fromEntries([
        "worldMapView", "levelView", "mapHeading", "playLevel", "levelSelectionDialog",
        "levelSelectionContent", "backToMap", "mapLevelTitle", "mapLevelStatus",
        "mapLevelCoins", "mapTotalCoins"
    ].map((id) => [id, element()]));
    const nodes = Array.from({ length: 10 }, (_, i) => Object.assign(element(), { dataset: { level: String(i + 1) } }));
    const windowListeners = {};
    globalThis.document = { getElementById: (id) => elements[id], querySelectorAll: () => nodes, createElement: element };
    globalThis.window = { addEventListener: (key, callback) => windowListeners[key] = callback };
    globalThis.location = { hash };
    let saved = [], completed = false, secondCompleted = false, thirdCompleted = false, fourthCompleted = false, plays = 0, returns = 0;
    const map = new WorldMap({ levels,
        getProgress: (id) => ({ unlocked: id === 1 || (id === 2 && completed) || (id === 3 && secondCompleted) || (id === 4 && thirdCompleted) || (id === 5 && fourthCompleted),
            completed: id === 1 && completed || id === 2 && secondCompleted || id === 3 && thirdCompleted || id === 4 && fourthCompleted, coinIds: id === 1 ? saved : [], fullyCompleted: id === 1 && saved.length === 3 }),
        getTotal: () => ({ earned: saved.length, possible: 30 }),
        onPlay: () => plays++, onMap: () => returns++
    });
    return { map, elements, nodes,
        get plays() { return plays; }, get returns() { return returns; },
        save(ids) { saved = ids; completed = true; map.refresh(); },
        completeFourth() { fourthCompleted = true; map.refresh(); },
        completeThird() { thirdCompleted = true; map.refresh(); },
        completeSecond() { secondCompleted = true; map.refresh(); },
        route(hash) { globalThis.location.hash = hash; windowListeners.hashchange(); },
        restore() { Object.assign(globalThis, previous); }
    };
}

test("default map, selection popup, play/replay and saved coin indicators share account progress", () => {
    const f = fixture();
    try {
        assert.equal(f.map.playing, false);
        assert.equal(f.elements.worldMapView.hidden, false);
        assert.equal(f.elements.levelView.hidden, true);
        f.nodes[0].listeners.click();
        assert.equal(f.elements.levelSelectionDialog.open, true);
        assert.match(f.elements.levelSelectionContent.children[0].textContent, /The First Adventure/);
        assert.equal(f.elements.levelSelectionContent.children[2].children.length, 3);
        f.elements.levelSelectionContent.children[3].listeners.click();
        assert.equal(globalThis.location.hash, "#level-1");
        f.route("#level-1");
        assert.equal(f.map.playing, true);
        assert.equal(f.plays, 1);
        f.save(["level-1-coin-1", "level-1-coin-3"]);
        f.route("#map");
        assert.equal(f.elements.mapTotalCoins.textContent, "Total Coins: 2/30");
        assert.equal(f.elements.playLevel.textContent, "Replay Level");
        const icons = f.elements.mapLevelCoins.children;
        assert.match(icons[0].className, /is-earned/);
        assert.doesNotMatch(icons[1].className, /is-earned/);
        assert.match(icons[2].className, /is-earned/);
        f.save([]); // Switching to an account without these achievements clears the map indicators.
        assert.equal(f.elements.mapTotalCoins.textContent, "Total Coins: 0/30");
        assert.ok(f.elements.mapLevelCoins.children.every((icon) => !icon.className.includes("is-earned")));
    } finally { f.restore(); }
});

test("deep links to Level 1 work; locked and unimplemented levels stay unavailable", () => {
    const f = fixture("#level-1");
    try {
        assert.equal(f.map.playing, true);
        assert.equal(f.nodes[0].disabled, false);
        assert.ok(f.nodes.slice(1).every((node) => node.disabled));
        assert.equal(f.map.hasNext(), false);
        f.map.openNext();
        assert.equal(globalThis.location.hash, "#level-1");
        f.route("#level-2");
        assert.equal(f.map.playing, false);
        f.route("#level-99");
        assert.equal(f.map.playing, false);
        assert.equal(f.plays, 1);
    } finally { f.restore(); }
});

test("finishing Level 1 unlocks Level 2 and explicit Next navigation without requiring coins", () => {
    const f = fixture("#level-1");
    try {
        assert.equal(f.map.hasNext(), false);
        f.save([]);
        assert.equal(f.nodes[1].disabled, false);
        assert.equal(f.map.hasNext(), true);
        assert.equal(globalThis.location.hash, "#level-1", "completion must not advance automatically");
        f.map.openNext();
        assert.equal(globalThis.location.hash, "#level-2");
        f.route("#level-2");
        assert.equal(f.map.playing, true);
        assert.match(f.elements.mapLevelTitle.textContent, /The Winding Grove/);
        assert.match(f.elements.mapLevelStatus.textContent, /Forest/);
        assert.equal(f.map.hasNext(), false);
        assert.ok(f.nodes.slice(2).every((node) => node.disabled));
    } finally { f.restore(); }
});



test("Level 2 unlocks Deep Forest selection and Next; Crystal Cave stays locked until Level 3 completion", () => {
    const f = fixture("#level-2");
    try {
        f.save([]); f.route("#level-2");
        assert.equal(f.nodes[2].disabled, true); assert.equal(f.map.hasNext(), false);
        f.completeSecond();
        assert.equal(f.nodes[2].disabled, false); assert.equal(f.map.hasNext(), true);
        assert.equal(globalThis.location.hash, "#level-2", "no automatic advancement");
        f.nodes[2].listeners.click();
        assert.match(f.elements.levelSelectionContent.children[0].textContent, /Deep Forest/);
        assert.equal(f.elements.levelSelectionContent.children[2].children.length, 3);
        f.map.openLevel(3); f.route("#level-3");
        assert.equal(f.map.playing, true); assert.equal(f.map.hasNext(), false);
        f.map.openNext(); assert.equal(globalThis.location.hash, "#level-3");
        assert.ok(f.nodes.slice(3).every(n => n.disabled));
        f.route("#level-4"); assert.equal(f.map.playing, false);
    } finally { f.restore(); }
});

test("completing Deep Forest unlocks Crystal Cave details and Next but Level 5 remains unavailable",()=>{
    const f=fixture("#level-3");
    try {
        f.save([]);f.completeSecond();f.route("#level-3");
        assert.equal(f.nodes[3].disabled,true);f.completeThird();
        assert.equal(f.nodes[3].disabled,false);assert.equal(f.map.hasNext(),true);
        f.nodes[3].listeners.click();
        assert.match(f.elements.levelSelectionContent.children[0].textContent,/Crystal Cave/);
        assert.equal(f.elements.levelSelectionContent.children[2].children.length,3);
        f.map.select(3);f.map.openNext();assert.equal(globalThis.location.hash,"#level-4");f.route("#level-4");
        assert.equal(f.map.playing,true);assert.equal(f.map.hasNext(),false);
        f.map.select(3);f.map.openNext();assert.equal(globalThis.location.hash,"#level-4");
        assert.ok(f.nodes.slice(4).every(n=>n.disabled));
    } finally {f.restore();}
});


test("Crystal Cave completion unlocks Sunscorched Dunes with three indicators; unbuilt Level 6 stays unavailable",()=>{
    const f=fixture();
    try {
        f.save([]);f.completeSecond();f.completeThird();f.route("#level-4");
        assert.equal(f.map.hasNext(),false);assert.equal(f.nodes[4].disabled,true);
        f.completeFourth();assert.equal(f.nodes[4].disabled,false);assert.equal(f.map.hasNext(),true);
        assert.equal(globalThis.location.hash,"#level-4","no automatic advancement");
        f.nodes[4].listeners.click();assert.match(f.elements.levelSelectionContent.children[0].textContent,/Sunscorched Dunes/);
        assert.equal(f.elements.levelSelectionContent.children[2].children.length,3);
        f.map.select(4);f.map.openNext();f.route("#level-5");assert.equal(f.map.playing,true);
        assert.equal(f.map.hasNext(),false);f.route("#level-6");assert.equal(f.map.playing,false);
        assert.ok(f.nodes.slice(5).every(n=>n.disabled));
    } finally {f.restore();}
});
