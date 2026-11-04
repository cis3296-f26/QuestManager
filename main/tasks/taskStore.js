import { QuestObject } from "../quests/questObject.js";
import { getCurrentUser } from "../users/userSession.js";
import { saveTask } from "./taskServices.js";

let tasks = [];
const listeners = [];

export function dateStr(d) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

export const todayStr = () => dateStr(new Date());
export const getTasks = () => tasks;
export const getTasksFor = (date) => tasks.filter(t => t.date === date);
export const subscribe = (fn) => listeners.push(fn);

const notify = () => listeners.forEach(fn => fn());

// rows come from Supabase (loadTasks)
export function setTasks(rows) {
    tasks = rows.map(r => {
        const t = new QuestObject(r.id, r.user_id, r.text, "", r.difficulty);
        t.date = r.task_date;
        if (r.done) t.complete();
        if (r.rewarded) t.markRewarded();
        return t;
    });
    notify();
}

export function addTask(title, difficulty = "easy", date = todayStr()) {
    const user = getCurrentUser();
    if (!user) return null;
    const t = new QuestObject(crypto.randomUUID(), user.id, title, "", difficulty);
    t.date = date;
    tasks.push(t);
    saveTask(t);
    notify();
    return t;
}

export function toggleTask(task, checked) {
    if (checked) task.complete();
    else task.uncomplete();
    saveTask(task);
    notify();
}

export function persist(task) {   // call after rewarded changes
    saveTask(task);
}