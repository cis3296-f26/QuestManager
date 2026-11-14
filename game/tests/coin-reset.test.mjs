import test from "node:test";
import assert from "node:assert/strict";
import { LevelProgressManager } from "../progress/LevelProgressManager.js";
import { LocalProgressStore } from "../progress/LocalProgressStore.js";
import { levels } from "../levels/levels.js";

function fixture() {
    const disk=new Map(),storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
    const open=(user="A")=>{
        const progress=new LevelProgressManager(new LocalProgressStore(storage));
        levels.forEach(l=>progress.registerLevel(l));progress.setUser(user);return progress;
    };
    const progress=open();for(const level of levels)progress.completeLevel(level.id,level.coins.map(c=>c.id));
    return {disk,open,progress};
}

test("current-level reset persists empty coins while keeping completion, unlocks, other levels and users",()=>{
    const {open,progress,disk}=fixture(),other=open("B");
    other.completeLevel(1,[levels[0].coins[1].id]);
    const otherRecord=disk.get(other.store.key("B"));
    progress.clearCoinProgress(2);
    const fresh=open();assert.deepEqual(fresh.getLevel(2).coinIds,[]);
    assert.equal(fresh.getLevel(2).completed,true);assert.equal(fresh.getLevel(2).fullyCompleted,false);
    assert.equal(fresh.getLevel(3).unlocked,true);assert.equal(fresh.getLevel(5).unlocked,true);
    for(const id of [1,3,4,5,6,7,8])assert.equal(fresh.getLevel(id).coinIds.length,3);
    assert.equal(disk.get(other.store.key("B")),otherRecord);
    assert.deepEqual(fresh.totalCoins,{earned:21,possible:30});
    fresh.completeLevel(2,[levels[1].coins[2].id]);assert.deepEqual(open().getLevel(2).coinIds,[levels[1].coins[2].id]);
});

test("all-level reset clears only coins, never creates completion records or touches unrelated storage",()=>{
    const {progress,open,disk}=fixture();disk.set("shop-balance","123");disk.set("preferences","unchanged");
    progress.clearCoinProgress();const fresh=open();
    assert.deepEqual(fresh.totalCoins,{earned:0,possible:30});
    for(const id of [1,2,3,4,5,6,7,8]){assert.equal(fresh.getLevel(id).completed,true);assert.deepEqual(fresh.getLevel(id).coinIds,[]);}
    assert.equal(fresh.getLevel(9).completed,false);assert.equal(fresh.getLevel(5).unlocked,true);assert.equal(fresh.getLevel(6).unlocked,true);assert.equal(fresh.getLevel(7).unlocked,true);assert.equal(fresh.getLevel(8).unlocked,true);
    assert.equal(disk.get("shop-balance"),"123");assert.equal(disk.get("preferences"),"unchanged");
});

test("a stale tab cannot restore banked coins after a reset, including when it completes a different level",()=>{
    const {progress,open}=fixture(),stale=open();
    progress.clearCoinProgress(2);stale.completeLevel(1,[]);
    assert.deepEqual(open().getLevel(2).coinIds,[]);
    stale.completeLevel(2,[]);assert.deepEqual(open().getLevel(2).coinIds,[]);
    stale.completeLevel(2,[levels[1].coins[0].id]);assert.deepEqual(open().getLevel(2).coinIds,[levels[1].coins[0].id]);
    const staleAgain=open();progress.clearCoinProgress(2);staleAgain.completeLevel(4,[]);
    assert.deepEqual(open().getLevel(2).coinIds,[]);
    // A real post-reset pickup can still be saved through a normal completion.
    staleAgain.completeLevel(2,[levels[1].coins[1].id]);assert.deepEqual(open().getLevel(2).coinIds,[levels[1].coins[1].id]);
});

test("invalid level reset is refused without writes; guest or blocked storage stays session-only",()=>{
    const {progress,disk}=fixture(),before=JSON.stringify([...disk]);
    assert.throws(()=>progress.clearCoinProgress(99));assert.equal(JSON.stringify([...disk]),before);
    const guest=new LevelProgressManager(new LocalProgressStore(null));levels.forEach(l=>guest.registerLevel(l));
    guest.completeLevel(1,levels[0].coins.map(c=>c.id));
    assert.equal(guest.clearCoinProgress(1).persistent,false);assert.deepEqual(guest.getLevel(1).coinIds,[]);assert.equal(guest.getLevel(1).completed,true);
});
