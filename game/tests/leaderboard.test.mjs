import test from "node:test";
import assert from "node:assert/strict";
import { personalRecords, compareAdventure, compareTimes, safeUsername } from "../leaderboard/records.js";
import { Leaderboard } from "../ui/Leaderboard.js";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { levels } from "../levels/levels.js";

function fixture() {
    const disk = new Map();
    const store = { load: id => ({ available: true, data: structuredClone(disk.get(id)) }), save(id, data) { if (id) disk.set(id, structuredClone(data)); return Boolean(id); } };
    const progress = new LevelProgressManager(store);
    levels.forEach(level => progress.registerLevel(level)); progress.setUser("test-account-a");
    return { progress, disk, complete(id, time = 1000) { progress.completeLevel(id, levels[id-1].coins.map(c=>c.id), { completionTimeMs: time }); } };
}
function dom() {
    const elements = new Map();
    const node = () => ({ children: [], attributes: {}, handlers: {}, hidden: false,
        replaceChildren(...children) { this.children = children; }, appendChild(child) { this.children.push(child); },
        setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(key, callback) { this.handlers[key] = callback; }, focus() { this.focused = true; }
    });
    const document = { createElement: node, getElementById(id) { if (!elements.has(id)) elements.set(id,node()); return elements.get(id); } };
    return { document, el: id => document.getElementById(id), text(element) { return [element.textContent ?? "", ...element.children.map(child => this.text(child))].join(" "); } };
}

test("records read existing APIs, count permanent coins and completed levels without writing", () => {
    const f = fixture(); f.complete(1); f.complete(2, null);
    const before = JSON.stringify([...f.disk]);
    const records = personalRecords(f.progress, levels);
    assert.equal(records.completed,2); assert.equal(records.coins.earned,6); assert.equal(records.coins.possible,30);
    assert.equal(records.timed,1); assert.equal(records.combinedMs,null); assert.equal(JSON.stringify([...f.disk]),before);
    assert.equal(records.records[1].timeMs,null);
});

test("combined best requires all ten valid completions; slow and assisted runs cannot alter it", () => {
    const f=fixture(); for(let id=1;id<=10;id++) f.complete(id,id*1000);
    assert.equal(personalRecords(f.progress,levels).combinedMs,55000);
    f.complete(1,9000); assert.equal(personalRecords(f.progress,levels).combinedMs,55000);
    f.progress.completeLevel(1,[],{completionTimeMs:1,developerAssisted:true});
    assert.equal(personalRecords(f.progress,levels).combinedMs,55000);
    assert.equal(personalRecords(f.progress,levels).coins.earned,30);
    f.complete(1,500);assert.equal(personalRecords(f.progress,levels).combinedMs,54500);
    f.progress.setUser("test-account-b"); assert.equal(personalRecords(f.progress,levels).combinedMs,null);
    f.progress.setUser(null); f.complete(1); f.progress.setUser("test-account-b");
    assert.equal(personalRecords(f.progress,levels).completed,0);
});

test("malformed and legacy saves cannot qualify or contribute zero time", () => {
    const f=fixture();
    for(const bad of [null,0,-1,NaN,Infinity,1.2,"1000",Number.MAX_SAFE_INTEGER+1]) {
        for(let id=1;id<=10;id++)f.complete(id,id===10?bad:1000);
        const data=personalRecords(f.progress,levels); assert.equal(data.combinedMs,null); assert.equal(data.timed,9);
    }
    f.complete(10,Number.MAX_SAFE_INTEGER);assert.equal(personalRecords(f.progress,levels).combinedMs,null,"overflow cannot qualify");
});

test("ranking priorities use progress first and comparable times last; invalid times sort last", () => {
    const a={completed:10,coins:{earned:20},combinedMs:60000}, b={completed:9,coins:{earned:27},combinedMs:1000};
    assert.ok(compareAdventure(a,b)<0);
    assert.ok(compareAdventure(a,{...a,coins:{earned:21}})>0);
    assert.ok(compareAdventure(a,{...a,combinedMs:61000})<0);
    assert.equal(compareAdventure(a,{...a,combinedMs:null}),0);
    assert.deepEqual([{timeMs:null},{timeMs:2000},{timeMs:1000}].sort(compareTimes).map(r=>r.timeMs),[1000,2000,null]);
});

test("UI tabs, dropdown, empty/legacy records, keyboard, play locks and ten-level breakdown", async () => {
    const f=fixture(), d=dom();f.complete(1,123450);f.complete(2,null);
    let played;
    const ui=new Leaderboard({document:d.document,progress:f.progress,levels,onPlay:id=>played=id,loadIdentity:async()=>({name:"Quest tester"})});
    await ui.refresh(); assert.equal(d.el("leaderboardName").textContent,"Quest tester");
    assert.match(d.text(d.el("leaderboardPersonal")),/2\/10/);
    d.el("leaderboardTab-level").handlers.click();
    assert.match(d.text(d.el("leaderboardPersonal")),/2:03.45/);
    assert.equal(d.el("leaderboardTab-level").attributes['aria-selected'],"true");
    d.el("leaderboardLevel").handlers.change({target:{value:"2"}});
    assert.match(d.text(d.el("leaderboardPersonal")),/no completion time recorded/i);
    d.el("leaderboardLevel").handlers.change({target:{value:"10"}});
    assert.equal(d.el("leaderboardPlay").disabled,true);d.el("leaderboardPlay").handlers.click();assert.equal(played,undefined);
    d.el("leaderboardLevel").handlers.change({target:{value:"1"}});d.el("leaderboardPlay").handlers.click();assert.equal(played,1);
    d.el("leaderboardTab-level").handlers.keydown({key:"ArrowRight",preventDefault(){}});
    assert.equal(ui.tab,"full"); assert.equal(d.el("leaderboardBreakdown").children.length,10);
    assert.match(d.text(d.el("leaderboardPersonal")),/record a best time for each/);
    assert.equal(d.el("leaderboardTab-full").focused,true);
    for(let id=2;id<=10;id++)f.complete(id,1000);ui.render();
    assert.match(d.text(d.el("leaderboardPersonal")),/2:12.45/);
});

test("switch/signout clears identity immediately, stale loads cannot leak names; failures preserve session records", async () => {
    const f=fixture(), d=dom();let resolve;
    const ui=new Leaderboard({document:d.document,progress:f.progress,levels,onPlay(){},loadIdentity:()=>new Promise(r=>resolve=r)});
    const pending=ui.refresh(), oldResolve=resolve;
    f.progress.setUser(null); ui.loadIdentity=async()=>({name:"Guest adventurer"});await ui.refresh();
    oldResolve({name:"Previous private name"});await pending;
    assert.equal(d.el("leaderboardName").textContent,"Guest adventurer");
    assert.match(d.el("leaderboardScope").textContent,/Sign in/);
    f.progress.setUser("test-account-b");f.progress.persistent=false;
    ui.loadIdentity=async()=>{throw Error("offline")};await ui.refresh();
    assert.equal(d.el("leaderboardName").textContent,"Adventurer");
    assert.match(d.el("leaderboardScope").textContent,/Session records only/);
    assert.match(d.el("leaderboardIdentityStatus").textContent,/unavailable/);
    for(const value of ["private@example.org","test-account-b","\u0000private",null])assert.equal(safeUsername(value,"test-account-b"),"Adventurer");
});
