// Run the real shared modules with an in-memory backend; never contact Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');

async function run(scenario) {
    const calls = [], storage = new Map();
    let account = 'account-A';
    const supabase = {
        auth: { async getSession() { return { data: { session: { user: { id: account } } } }; } },
        from(table) {
            const query = { fields: '', filters: {}, inserted: null };
            const result = () => table === 'profiles'
                ? { data: { id: query.filters.id, username: query.filters.id, balance: 100 }, error: null }
                : table === 'player_inventory'
                    ? { data: query.filters.user_id === 'account-A' ? [{ item_id: 'wizard-hat', equipped: true }] : [], error: null }
                    : { data: { id: 'task-1', user_id: account, completed: false, ...query.inserted }, error: null };
            const builder = {
                select(fields) { query.fields = fields; return this; },
                eq(key, value) { query.filters[key] = value; return this; },
                insert(row) { query.inserted = row; calls.push({ table, insert: row }); return this; },
                update(row) { calls.push({ table, update: row, filters: query.filters }); return this; },
                single: async () => result(),
                then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); }
            };
            return builder;
        },
        async rpc(name, args) { calls.push({ name, args }); return { data: null, error: null }; }
    };
    const document = { querySelectorAll: () => [], dispatchEvent() {} };
    const context = vm.createContext({ console, document, setInterval() {}, URL,
        CustomEvent: class { constructor(type) { this.type = type; } },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
        Image: class { constructor() { this.naturalWidth = this.naturalHeight = 128; } async decode() {} }
    });
    const client = new vm.SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); }, { context });
    await client.link(() => {}); await client.evaluate();
    const modules = new Map();
    const get = id => {
        if (id === 'main/users/supabaseClient.js') return client;
        if (!modules.has(id)) {
            const module = new vm.SourceTextModule(fs.readFileSync(path.join(root, id), 'utf8'), {
                context, identifier: id,
                initializeImportMeta(meta) { meta.url = new URL(id, 'https://questmanager.test/').href; },
                importModuleDynamically: async (specifier, ref) => {
                    const target = get(path.posix.normalize(path.posix.join(path.posix.dirname(ref.identifier), specifier)));
                    if (target.status === 'unlinked') await target.link(link);
                    if (target.status === 'linked') await target.evaluate();
                    return target;
                }
            });
            modules.set(id, module);
        }
        return modules.get(id);
    };
    const link = (specifier, ref) => get(path.posix.normalize(path.posix.join(path.posix.dirname(ref.identifier), specifier)));
    const load = async id => { const m = get(id); if (m.status === 'unlinked') await m.link(link); if (m.status === 'linked') await m.evaluate(); return m.namespace; };
    const player = await load('main/users/playerData.js');

    if (scenario === 'tasks') {
        const { QuestObject } = await load('main/quests/questObject.js');
        const row = await player.createTask('Practice', 'One course', 'easy', '2026-11-12', '14:30', 'high', 'school');
        const quest = QuestObject.fromRow(row);
        assert.equal(quest.time, '14:30'); assert.equal(quest.priority, 'high'); assert.equal(quest.taskType, 'school');
        assert.equal(quest.giveReward(), 10); assert.equal(quest.rewarded, false);
        await player.createTask('Legacy', '', 'easy', '2026-11-12');
        assert.equal(calls[1].insert.task_time, null); assert.equal(calls[1].insert.priority, 'medium');
        await player.updateTaskSchedule('task-1', '2026-11-13', '09:00:00');
        assert.equal(calls[2].filters.id, 'task-1'); assert.equal(calls[2].update.task_date, '2026-11-13');
    } else if (scenario === 'avatar') {
        const { SHOP_ITEMS } = await load('main/shop/shopItems.js');
        const hat = SHOP_ITEMS.find(item => item.category === 'avatar');
        assert.ok(hat);
        // Use a real owned item ID so cleaning and layering run, rather than stubbing the avatar.
        const originalFrom = supabase.from;
        supabase.from = table => {
            if (table !== 'player_inventory') return originalFrom(table);
            let user;
            const builder = { select() { return this; }, eq(key, value) { user = value; return this; },
                then(resolve, reject) { return Promise.resolve({ data: user === 'account-A' ? [{ item_id: hat.id, equipped: true }] : [], error: null }).then(resolve, reject); } };
            return builder;
        };
        const { AvatarRenderer } = await load('game/rendering/AvatarRenderer.js');
        const avatar = new AvatarRenderer(); await avatar.load();
        assert.equal(avatar.layers.length, 2, 'base plus equipped item');
        account = 'account-B'; await avatar.load();
        assert.equal(avatar.layers.length, 1, 'second account must not inherit equipment');
    } else if (scenario === 'session') {
        const session = await load('main/users/userSession.js');
        await session.setUserFromSession({ user: { id: 'account-A' } });
        assert.equal(session.getCurrentUser().id, 'account-A');
        await session.setUserFromSession({ user: { id: 'account-B' } });
        assert.equal(session.getCurrentUser().id, 'account-B');
        assert.equal(session.getCurrentUser().inventory.length, 0);
        await session.setUserFromSession(null); assert.equal(session.getCurrentUser(), null);
    } else throw new Error('Unknown scenario');
    console.log(`PASS ${scenario}`);
}
run(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });
