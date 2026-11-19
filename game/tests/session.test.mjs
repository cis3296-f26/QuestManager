import test from "node:test";
import assert from "node:assert/strict";
import { connectGameSession } from "../progress/GameSession.js";

test("auth refresh keeps identity, account switch/sign-out notify, verification checks the current account", async () => {
    const events = [];
    let callback, userId = "account-A", unavailable = false;
    const supabase = { auth: {
        onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
        async getSession() {
            return { data: { session: userId ? { user: { id: userId } } : null }, error: unavailable ? Error("offline") : null };
        }
    } };
    const session = await connectGameSession((id) => events.push(id), async () => ({ supabase }));
    assert.equal(events.at(-1), "account-A");
    assert.equal(await session.verifyAccount("account-A"), true);
    userId = "account-B"; // A different tab signs in before its auth event arrives here.
    assert.equal(await session.verifyAccount("account-A"), false);
    assert.equal(events.at(-1), "account-B");
    callback("TOKEN_REFRESHED", { user: { id: userId } });
    assert.equal(events.at(-1), "account-B");
    userId = null;
    callback("SIGNED_OUT", null);
    assert.equal(events.at(-1), null);
    assert.equal(await session.verifyAccount(null), true);
    unavailable = true;
    assert.equal(await session.verifyAccount("account-B"), false);
});

test("a newer account event wins over an older initial session read", async () => {
    const events = [];
    let callback, resolve;
    const pending = new Promise((done) => resolve = done);
    const promise = connectGameSession((id) => events.push(id), async () => ({ supabase: { auth: {
        onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
        getSession: () => pending
    } } }));
    await Promise.resolve();
    await Promise.resolve();
    callback("SIGNED_IN", { user: { id: "new-account" } });
    resolve({ data: { session: { user: { id: "old-account" } } } });
    await promise;
    assert.deepEqual(events, ["new-account"]);
});

test("unavailable auth supports only a session-only guest, never a guessed account", async () => {
    const events = [];
    const session = await connectGameSession((id) => events.push(id), async () => { throw Error("CDN unavailable"); });
    assert.deepEqual(events, [null]);
    assert.equal(await session.verifyAccount(null), true);
    assert.equal(await session.verifyAccount("account-A"), false);
});
