import test from "node:test";
import assert from "node:assert/strict";
import { CoinManager } from "../levels/CoinManager.js";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { LocalProgressStore } from "../progress/LocalProgressStore.js";
import { level1 } from "../levels/Level1.js";
import { LevelManager } from "../levels/LevelManager.js";
import { moveHorizontally, applyGravity, jump } from "../engine/Physics.js";
import { touchesHazard } from "../engine/Hazards.js";
import { renderCoinProgress } from "../ui/CoinProgress.js";
import { renderLevelSelection } from "../ui/LevelSelection.js";

function memoryStorage() {
    const data = new Map();
    return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data };
}
function progressFor(storage, user = "account-A") {
    const progress = new LevelProgressManager(new LocalProgressStore(storage));
    progress.registerLevel(level1);
    progress.setUser(user);
    return progress;
}
const ids = level1.coins.map((coin) => coin.id);
const touching = (coin) => ({ x: coin.x - 10, y: coin.y - 20, width: 32, height: 64 });

test("exactly three stable, unique coins; collect once, remove for the attempt, discard on death/restart", () => {
    const coins = new CoinManager(level1.coins);
    assert.equal(coins.coins.length, 3);
    assert.throws(() => new CoinManager([level1.coins[0]]));
    assert.throws(() => new CoinManager([level1.coins[0], level1.coins[0], level1.coins[2]]));
    assert.equal(coins.update(touching(level1.coins[0]), 1 / 60), true);
    assert.equal(coins.count, 1);
    assert.equal(coins.effects.length, 1);
    assert.equal(coins.update(touching(level1.coins[0]), 1 / 60), false);
    const drawn = [];
    coins.coins.forEach((coin) => { coin.draw = () => drawn.push(coin.id); });
    coins.draw(new Proxy({ globalAlpha: 1 }, { get: (target, key) => target[key] ?? (() => {}) }), 0, level1.worldWidth);
    assert.deepEqual(drawn, ids.slice(1));
    coins.discard();
    assert.equal(coins.count, 0);
    assert.equal(coins.effects.length, 0);
    coins.reset([ids[0]]);
    assert.equal(coins.update(touching(level1.coins[0]), 1 / 60), false);
    assert.equal(coins.count, 1);
    assert.equal(coins.pending.size, 0);
});

test("finish 1+2, die with 3, finish 3 later, repeat: IDs accumulate without duplicates", () => {
    const storage = memoryStorage();
    const progress = progressFor(storage);
    const coins = new CoinManager(level1.coins);
    for (const coin of level1.coins.slice(0, 2)) coins.update(touching(coin), 1 / 60);
    assert.equal(storage.data.size, 0, "touching coins must not save anything");
    assert.deepEqual(progress.completeLevel(1, [...coins.pending]).coinIds, ids.slice(0, 2));
    const replay = progressFor(storage); // Represents refresh/reopening for the same account.
    coins.reset(replay.getLevel(1).coinIds);
    coins.update(touching(level1.coins[2]), 1 / 60);
    assert.equal(coins.count, 3);
    coins.discard(); // Death immediately after the pickup.
    assert.equal(coins.count, 2);
    assert.deepEqual(progressFor(storage).getLevel(1).coinIds, ids.slice(0, 2));
    coins.reset(replay.getLevel(1).coinIds);
    coins.update(touching(level1.coins[2]), 1 / 60);
    const complete = replay.completeLevel(1, [...coins.pending]);
    assert.equal(complete.fullyCompleted, true);
    assert.deepEqual(complete.coinIds, ids);
    for (let i = 0; i < 20; i++) replay.completeLevel(1, [...ids, ...ids, "unknown-coin"]);
    assert.deepEqual(progressFor(storage).getLevel(1).coinIds, ids);
    assert.deepEqual(replay.totalCoins, { earned: 3, possible: 30 });
});

test("completion without coins unlocks the next level; 3/3 is a separate achievement", () => {
    const progress = progressFor(memoryStorage());
    assert.equal(progress.getLevel(1).unlocked, true);
    assert.equal(progress.getLevel(2).unlocked, false);
    const completed = progress.completeLevel(1, []);
    assert.equal(completed.completed, true);
    assert.equal(completed.fullyCompleted, false);
    assert.equal(progress.getLevel(2).unlocked, true);
    assert.equal(progress.getLevel(3).unlocked, false);
});

test("accounts and guest saves are isolated; uncompleted attempts never survive refresh", () => {
    const storage = memoryStorage();
    const progress = progressFor(storage);
    progress.completeLevel(1, [ids[0]]);
    progress.setUser("account-B");
    assert.deepEqual(progress.getLevel(1).coinIds, []);
    progress.completeLevel(1, [ids[2]]);
    assert.deepEqual(progressFor(storage, "account-A").getLevel(1).coinIds, [ids[0]]);
    assert.deepEqual(progressFor(storage, "account-B").getLevel(1).coinIds, [ids[2]]);
    progress.setUser(null);
    progress.completeLevel(1, ids);
    assert.equal(progress.persistent, false);
    assert.deepEqual(progressFor(storage, null).getLevel(1).coinIds, []);
    progress.setUser("account-C");
    assert.equal(progress.getLevel(1).completed, false, "guest results never migrate to an account");
    assert.equal(storage.data.size, 2);
    const coins = new CoinManager(level1.coins);
    coins.update(touching(level1.coins[1]), 1 / 60);
    assert.equal(progressFor(storage, "account-C").getLevel(1).completed, false);
});

test("unavailable storage is memory-only, corrupted saves are safe, latest completed IDs are merged", () => {
    const denied = { getItem() { throw Error("denied"); }, setItem() { throw Error("quota"); } };
    const temporary = progressFor(denied);
    temporary.completeLevel(1, [ids[0]]);
    assert.equal(temporary.persistent, false);
    assert.deepEqual(temporary.getLevel(1).coinIds, [ids[0]]);
    const storage = memoryStorage(), adapter = new LocalProgressStore(storage);
    storage.setItem(adapter.key("account-A"), "not JSON");
    assert.equal(progressFor(storage).getLevel(1).completed, false);
    const firstTab = progressFor(storage), secondTab = progressFor(storage);
    firstTab.completeLevel(1, [ids[0]]);
    secondTab.completeLevel(1, [ids[2]]);
    assert.deepEqual(progressFor(storage).getLevel(1).coinIds, [ids[0], ids[2]]);
    storage.setItem(adapter.key("account-A"), JSON.stringify({ version: 1, levels: {
        1: { completed: true, coinIds: [ids[0], ids[0], "bogus"] },
        2: { completed: false, coinIds: ids },
        99: { completed: true, coinIds: ids }
    } }));
    assert.deepEqual(progressFor(storage).getLevel(1).coinIds, [ids[0]]);
    assert.deepEqual(progressFor(storage).totalCoins, { earned: 1, possible: 30 });
});

test("coin routes work with unchanged physics, geometry and enemy patrols at 30/60/120 fps", () => {
    const routes = [
        { index: 0, start: 80, stop: 550, jumps: [] },
        { index: 1, start: 6300, stop: 6940, jumps: [6380, 6550, 6750] },
        { index: 2, start: 18390, stop: 19600, jumps: [18460, 18640, 18870, 19340] }
    ];
    for (const fps of [30, 60, 120]) for (const route of routes) {
        const level = new LevelManager(level1), coins = new CoinManager(level1.coins);
        const { player } = level;
        player.x = route.start;
        let nextJump = 0, reached = false;
        for (let frame = 0; frame < fps * 8; frame++) {
            if (nextJump < route.jumps.length && player.x >= route.jumps[nextJump] && player.grounded) {
                jump(player, 650);
                nextJump++;
            }
            moveHorizontally(player, player.x < route.stop ? 1 : 0, 280, level1.worldWidth, 1 / fps);
            applyGravity(player, 1800, level1.platforms, 1 / fps);
            for (const enemy of level.enemies) enemy.update(1 / fps);
            assert.ok(player.y < 540, `fell on coin ${route.index + 1} route at ${fps}fps`);
            assert.equal(touchesHazard(player, level1.hazards), false);
            assert.equal(level.enemies.some((enemy) => enemy.touches(player)), false,
                `enemy on coin ${route.index + 1} route at ${fps}fps`);
            coins.update(player, 1 / fps);
            if (coins.pending.has(ids[route.index])) reached = true;
            if (player.x >= route.stop && player.grounded) break;
        }
        assert.ok(reached, `unreachable coin ${route.index + 1} at ${fps}fps`);
        assert.ok(player.x >= route.stop && player.grounded, "route must end on a safe landing");
    }
});

test("coin UI preserves specific earned slots and reusable selection actions", () => {
    const element = () => ({ children: [], classList: { add() {} }, attributes: {},
        setAttribute(key, value) { this.attributes[key] = value; },
        appendChild(child) { this.children.push(child); },
        replaceChildren(...children) { this.children = children; },
        addEventListener(key, callback) { this[key] = callback; } });
    const originalDocument = globalThis.document;
    globalThis.document = { createElement: element };
    try {
        const target = element();
        renderCoinProgress(target, level1.coins, [ids[2]], [ids[0]]);
        assert.match(target.children[0].className, /is-pending/);
        assert.doesNotMatch(target.children[1].className, /is-earned|is-pending/);
        assert.match(target.children[2].className, /is-earned/);
        assert.match(target.children[2].attributes["aria-label"], /Coin 3: saved/);
        let played;
        renderLevelSelection(target, level1, { unlocked: true, completed: true, coinIds: [ids[2]] }, (id) => played = id);
        assert.match(target.children[0].textContent, /The First Adventure/);
        assert.equal(target.children[3].textContent, "Replay Level");
        target.children[3].click();
        assert.equal(played, 1);
    } finally { globalThis.document = originalDocument; }
});
