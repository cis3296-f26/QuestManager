import { initLogin } from "./users/login.js";
import { getCurrentUser } from "./users/userSession.js";
import { loadTasks } from "./tasks/taskServices.js";
import {
    getTasks, getTasksFor, addTask as storeAdd, toggleTask,
    setTasks, subscribe, todayStr
} from "./tasks/taskStore.js";

// Routing first, so the tabs work even if something below fails
function route() {
    let page = location.hash.replace("#", "") || "home";
    if (!document.getElementById(page)) page = "home";
    document.querySelectorAll(".page").forEach(p => { p.hidden = p.id !== page; });
    document.querySelectorAll("#mainNav .nav-link").forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === "#" + page);
    });
}
window.addEventListener("hashchange", route);
route();

var input = document.getElementById("taskInput");
var difficultySelect = document.getElementById("difficultySelect");
var list = document.getElementById("taskList");
var calendar = null;
let selectedDate = todayStr();
let activeUserId = null;

// ---------- Checklist ----------
function renderChecklist() {
    list.replaceChildren();
    getTasksFor(selectedDate).forEach(task => list.appendChild(buildTaskItem(task)));
}

function buildTaskItem(task) {
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = task.completed;
    cb.disabled = !getCurrentUser();
    const text = document.createElement("span");
    text.textContent = " " + task.title;
    text.classList.toggle("completed", task.completed);

    cb.onclick = () => {
        const user = getCurrentUser();
        // Only the account that created this task can complete it.
        if (!user || user.id !== task.userID) { cb.checked = false; return; }

        toggleTask(task, cb.checked);

        // Retry unpaid tasks, but never request another reward after payment succeeds.
        if (task.completed && !task.rewarded) {
            document.dispatchEvent(new CustomEvent("questmanager:taskCompleted", {
                detail: { task }
            }));
        }
    };
    li.append(cb, text);
    return li;
}

function addTask() {
    if (!getCurrentUser()) return;
    const title = input.value.trim();
    if (title === "") return;
    storeAdd(title, difficultySelect.value, selectedDate);
    input.value = "";
    difficultySelect.value = "easy";
}

// ---------- Session ----------
function syncTaskSession() {
    const user = getCurrentUser();
    const nextUserId = user?.id ?? null;

    if (nextUserId !== activeUserId) {
        activeUserId = nextUserId;
        input.value = "";
        difficultySelect.value = "easy";
        document.getElementById("image").src = "assets/my_character.jpg";
        loadTasks().then(setTasks);   // empty when signed out
    }

    input.disabled = !user;
    difficultySelect.disabled = !user;
    document.getElementById("addButton").disabled = !user;
    document.getElementById("dayAddButton").disabled = !user;
    document.getElementById("dayTaskInput").disabled = !user;
}

document.addEventListener("questmanager:userChanged", syncTaskSession);

input.addEventListener("keypress", e => {
    if (e.key === "Enter") document.getElementById("addButton").click();
});

// ---------- Calendar day panel ----------
function renderDayPanel() {
    document.getElementById("dayPanelTitle").textContent = "Tasks for " + selectedDate;
    const dayList = document.getElementById("dayTaskList");
    dayList.replaceChildren();
    getTasksFor(selectedDate).forEach(task => dayList.appendChild(buildTaskItem(task)));
}

function addDayTask() {
    const dayInput = document.getElementById("dayTaskInput");
    const title = dayInput.value.trim();
    if (!getCurrentUser() || title === "") return;
    storeAdd(title, "easy", selectedDate);
    dayInput.value = "";
}

// ---------- Views ----------
function showTasks() {
    selectedDate = todayStr();
    renderChecklist();
    document.getElementById("tasksView").style.display = "block";
    document.getElementById("calendarView").style.display = "none";
}

function showCalendar() {
    document.getElementById("tasksView").style.display = "none";
    document.getElementById("calendarView").style.display = "block";

    if (!calendar) {
        calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
            initialView: "dayGridMonth",
            height: "auto",
            headerToolbar: {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek"
            },
            events: (info, success) => success(
                getTasks().map(t => ({
                    id: t.id, title: t.title, start: t.date, allDay: true,
                    classNames: t.completed ? ["completed"] : []
                }))
            ),
            dateClick: info => {
                selectedDate = info.dateStr;
                renderDayPanel();
            }
        });
    }
    calendar.render();
    renderDayPanel();
}

// ---------- Wiring ----------
subscribe(renderChecklist);
subscribe(renderDayPanel);
subscribe(() => calendar?.refetchEvents());

document.getElementById("addButton")?.addEventListener("click", addTask);
document.getElementById("dayAddButton")?.addEventListener("click", addDayTask);
document.getElementById("todoButton")?.addEventListener("click", showTasks);
document.getElementById("calendarButton")?.addEventListener("click", showCalendar);

syncTaskSession();
initLogin();