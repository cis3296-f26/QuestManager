import { supabase } from "../../supabase/supabaseClient.js";
import { getCurrentUser } from "../users/userSession.js";

export async function loadTasks() {
    const user = getCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
        .from("tasks").select("*").eq("user_id", user.id).order("created_at");
    if (error) { console.error(error); return []; }
    return data;   // raw rows, the store turns them into QuestObjects
}

export async function saveTask(task) {
    const user = getCurrentUser();
    if (!user) return;
    const { error } = await supabase.from("tasks").upsert({
        id: task.taskID,
        user_id: task.userID,
        text: task.title,
        difficulty: task.difficulty,
        task_date: task.date,
        done: task.completed,
        rewarded: task.rewarded
    });
    if (error) console.error(error);
}