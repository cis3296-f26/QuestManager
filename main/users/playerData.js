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
export async function createTask(title, description, difficulty, taskDate, taskTime = null, priority = "medium", taskType = "personal") {
    const { data, error } = await supabase
        .from("tasks")
        .insert({ title, description, difficulty, task_date: taskDate, task_time: taskTime, priority, task_type: taskType })
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

// Marks a finished task as not done and takes its reward back.
export async function uncompleteTask(taskId) {
    const { error } = await supabase.rpc("uncomplete_task", { p_task_id: taskId });
    if (error) throw error;
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

export async function updateTaskSchedule(taskId, taskDate, taskTime) {
    const { error } = await supabase
        .from("tasks")
        .update({ task_date: taskDate, task_time: taskTime })
        .eq("id", taskId);
    if (error) throw error;
}
// Saves edits to a task. `fields` uses the column names of the "tasks" table.
export async function updateTask(taskId, fields) {
    const { data, error } = await supabase
        .from("tasks")
        .update(fields)
        .eq("id", taskId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// Removes a task for good.
export async function deleteTask(taskId) {
    const { data, error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .select();
    if (error) throw error;
    // Supabase returns no error when row-level security blocks a delete, just no rows.
    if (!data || data.length === 0) throw new Error("The task wasn't deleted (no permission or already gone).");
}

// Stored in the Supabase auth user's metadata (no table or SQL needed).
export async function saveAppearance(appearance) {
    const { error } = await supabase.auth.updateUser({ data: { appearance } });
    if (error) throw error;
}
