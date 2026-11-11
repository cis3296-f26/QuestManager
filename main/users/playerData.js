import { supabase } from "./supabaseClient.js";

// true once we know the database has the equipped column + set_item_equipped
let equipSavedInDatabase = true;

// ---------- Local (browser) fallback for equipped items ----------
const localKey = (userId) => "equipped:" + userId;

function loadLocalEquipped(userId) {
    try {
        return JSON.parse(localStorage.getItem(localKey(userId))) ?? [];
    } catch {
        return [];
    }
}

function saveLocalEquipped(userId, ids) {
    localStorage.setItem(localKey(userId), JSON.stringify(ids));
}

// ---------- Player ----------
async function loadInventory(userId) {
    const withEquipped = await supabase
        .from("player_inventory")
        .select("item_id, equipped")
        .eq("user_id", userId);

    if (!withEquipped.error) {
        equipSavedInDatabase = true;
        return withEquipped.data;
    }
    if (withEquipped.error.code !== MISSING_COLUMN) throw withEquipped.error;

    // Older schema: read owned items only and use the local loadout.
    equipSavedInDatabase = false;
    const owned = await supabase
        .from("player_inventory")
        .select("item_id")
        .eq("user_id", userId);
    if (owned.error) throw owned.error;
    return owned.data;
}

export async function loadPlayer(userId) {
    const [profileResult, inventory] = await Promise.all([
        supabase
            .from("profiles")
            .select("id, username, balance")
            .eq("id", userId)
            .single(),
        loadInventory(userId)
    ]);

    if (profileResult.error) throw profileResult.error;

    return {
        id: profileResult.data.id,
        username: profileResult.data.username,
        balance: profileResult.data.balance,
        inventory: inventory.map((row) => row.item_id),
        equipped: equipSavedInDatabase
            ? inventory.filter((row) => row.equipped).map((row) => row.item_id)
            : loadLocalEquipped(userId)
    };
}

// ---------- Tasks ----------
// Saved tasks for this user
export async function loadTasks(userId) {
    const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at");
    if (error) throw error;
    return data;
}

// taskDate is "YYYY-MM-DD"
export async function createTask(title, description, difficulty, taskDate, priority = "medium", taskType = "personal") {
    const { data, error } = await supabase
        .from("tasks")
        .insert({ title, description, difficulty, task_date: taskDate, priority, task_type: taskType })
        .select()
        .single();
    if (error) throw error;
    return data;
}

// Marks the task done and pays its reward once.
export async function completeTask(taskId) {
    const { data, error } = await supabase.rpc("complete_task", { p_task_id: taskId });
    if (error) throw error;
    return data;
}

// ---------- Shop ----------
// The database checks price, balance and IF OWNED
export async function buyItem(itemId) {
    const { error } = await supabase.rpc("buy_shop_item", { p_item_id: itemId });
    if (error) throw error;
}

// ---------- Equipped items ----------
export async function saveEquipped(userId, itemId, equipped, allEquippedIds) {
    if (equipSavedInDatabase) {
        const { error } = await supabase.rpc("set_item_equipped", {
            p_item_id: itemId,
            p_equipped: equipped
        });
        if (!error) return;
        if (error.code !== MISSING_FUNCTION) throw error;
        equipSavedInDatabase = false;
    }
    saveLocalEquipped(userId, allEquippedIds);
}