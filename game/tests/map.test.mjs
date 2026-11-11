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
    let saved = [], completed = false, plays = 0, returns = 0;
    const map = new WorldMap({ levels,
        getProgress: (id) => ({ unlocked: id === 1 || (id === 2 && completed),
            completed: id === 1 && completed, coinIds: id === 1 ? saved : [], fullyCompleted: id === 1 && saved.length === 3 }),
        getTotal: () => ({ earned: saved.length, possible: 30 }),
        onPlay: () => plays++, onMap: () => returns++
    });
    return { map, elements, nodes,
        get plays() { return plays; }, get returns() { return returns; },
        save(ids) { saved = ids; completed = true; map.refresh(); },
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
