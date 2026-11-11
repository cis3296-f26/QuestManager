import { initLogin } from "./users/login.js";
import { getCurrentUser, refreshCurrentUser } from "./users/userSession.js";
import { QuestObject, PRIORITIES } from "./quests/questObject.js";
import { loadTasks, createTask, completeTask, updateTaskSchedule } from "./users/playerData.js";

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
var descriptionInput = document.getElementById("taskDescription");
const priorityBoard = document.getElementById("priorityBoard");
const typeFilter = document.getElementById("typeFilter");
const priorityInput = document.getElementById("questPriority");
const typeInput = document.getElementById("questType");
var addButton = document.getElementById("addButton");
const questForm = document.getElementById("questForm");
const difficultyInputs = questForm.querySelectorAll('input[name="difficulty"]');
const closeTaskForm = document.getElementById("closeTaskForm");
const taskForm = document.getElementById("taskForm");
const toggleTaskForm = document.getElementById("toggleTaskForm");
const toggleDayForm = document.getElementById("toggleDayForm");
const dayForm = document.getElementById("dayForm");
var calendar = null;

// Local date as YYYY-MM-DD (toISOString would shift the day by timezone)
const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
let allTasks = [];
let selectedDate = todayStr();

// ---------- Rendering ----------
// Today's quests, split into High / Medium / Low.
function renderPriorityBoard() {
    const filter = typeFilter.value;
    const todays = allTasks.filter(t =>
        t.date === todayStr() && (filter === "all" || t.taskType === filter));
    PRIORITIES.forEach(priority => {
        const section = priorityBoard.querySelector(`[data-priority="${priority}"]`);
        const target = section.querySelector(".priority-list");
        const tasks = todays.filter(t => t.priority === priority);

        target.replaceChildren();
        tasks.forEach(t => renderTask(t, target));
        section.querySelector(".priority-count").textContent = tasks.length;
    });
}
// Redraws the checklist (today), the day panel (selected date) and the calendar.
function renderLists() {
    renderPriorityBoard();

    const dayTitle = document.getElementById("dayPanelTitle");
    const dayList = document.getElementById("dayTaskList");
    if (dayTitle && dayList) {
        dayTitle.textContent = selectedDate === todayStr()
            ? "Today's Quest Board"
            : "Quests for " + selectedDate;
        dayList.replaceChildren();
        allTasks.filter(t => t.date === selectedDate).forEach(t => renderTask(t, dayList));
    }

    calendar?.refetchEvents();
}

// Draw one task into a list (the checklist by default).
function renderTask(task, target) {
    var li = document.createElement("li");
        li.dataset.difficulty = task.difficulty;
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.disabled = !getCurrentUser() || task.rewarded;
    checkbox.dataset.rewarded = String(task.rewarded);

    // Give the completion checkbox an accessible name.
    checkbox.setAttribute("aria-label", "Complete task: " + task.title);

    var text = document.createElement("span");
    text.className = "quest-title";
    text.textContent = task.title;
    text.classList.toggle("completed", task.completed);

    var description = document.createElement("p");
    description.className = "quest-description";
    description.textContent = task.description || "";
    description.hidden = !description.textContent.trim();

    var difficulty = document.createElement("p");
    difficulty.className = "quest-difficulty";
    difficulty.textContent = "Difficulty: " + task.difficulty;

    // This reflects completion; payment remains handled by the existing logic.
    var badge = document.createElement("span");
    badge.className = "quest-status";
    badge.classList.toggle("is-completed", task.completed);
    badge.textContent = task.completed ? "Completed" : "In progress";

    checkbox.onclick = async function () {

        // Only the account that created this task can complete it, and only once.
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.id !== task.userID || task.rewarded) {
            checkbox.checked = task.completed;
            return;
        }

        checkbox.disabled = true; // stop double-clicks

        try {
            // The database marks it done and pays the reward exactly once.
            await completeTask(task.taskID);
            task.complete();
            task.markRewarded();
            await refreshCurrentUser(); // updates the coin counter and the shop
            renderLists();              // updates checklist, day panel and calendar
        } catch (error) {
            console.error(error);
            checkbox.checked = false;
            checkbox.disabled = false;
            alert("Couldn't save that: " + error.message);
        }
    };

    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(description);
    li.appendChild(difficulty);
    li.appendChild(badge);
    target.appendChild(li);
}

// ---------- Adding tasks ----------
async function addTaskFor(title, difficulty, date, description = "", time = null, priority = "medium", taskType = "personal") {
    // Save the description alongside the other task details.
    const row = await createTask(title, description, difficulty, date, time, priority, taskType);
    allTasks.push(QuestObject.fromRow(row));
    renderLists();
}

async function addTask() {
    const user = getCurrentUser();
    if (!user || addButton.disabled) return;

    const title = input.value.trim();
    if (title === "") {
        input.focus();
        return;
    }

    const difficulty =
        questForm.querySelector('input[name="difficulty"]:checked').value;
    const description = descriptionInput.value.trim();

    addButton.disabled = true;

    try {
        // Use the picked due date, or today if the field is empty.
        const dueDate = document.getElementById("questDueDate").value || todayStr();
        const dueTime = document.getElementById("questDueTime").value || null;
        await addTaskFor(title, difficulty, dueDate, description, dueTime, priorityInput.value, typeInput.value);
        questForm.reset();
        setTaskFormOpen(false);
    } catch (error) {
        console.error(error);
        alert("Couldn't save the task: " + error.message);
    } finally {
        addButton.disabled = !getCurrentUser();
    }
}

/*async function addDayTask() {
    const dayInput = document.getElementById("dayTaskInput");
    const dayButton = document.getElementById("dayAddButton");
    const title = dayInput.value.trim();
    if (!getCurrentUser() || title === "") return;

    dayButton.disabled = true;
    try {
        await addTaskFor(title, "easy", selectedDate, "", null);
        dayInput.value = "";
    } catch (error) {
        console.error(error);
        alert("Couldn't save the task: " + error.message);
    } finally {
        dayButton.disabled = !getCurrentUser();
    }
}*/

// ---------- Session ----------
let activeUserId = null;

async function syncTaskSession() {
    const user = getCurrentUser();
    const nextUserId = user?.id ?? null;

    // Tasks require a signed-in account.
    input.disabled = !user;
    descriptionInput.disabled = !user;
    difficultyInputs.forEach(radio => {
        radio.disabled = !user;
    });
    addButton.disabled = !user;
    toggleTaskForm.disabled = !user;
    //const dayInput = document.getElementById("dayTaskInput");
    //const dayButton = document.getElementById("dayAddButton");
    //if (dayInput) dayInput.disabled = !user;
    //if (dayButton) dayButton.disabled = !user;
    //if (toggleDayForm) toggleDayForm.disabled = !user;
    document.querySelectorAll("#priorityBoard input[type='checkbox'], #dayTaskList input[type='checkbox']")
        .forEach((checkbox) => {
            checkbox.disabled = !user || checkbox.dataset.rewarded === "true";
        });

    // Same account (e.g. a balance refresh): keep the list as it is.
    if (nextUserId === activeUserId) return;

    // Clear the previous account
    setTaskFormOpen(false);
    allTasks = [];
    renderLists();
    input.value = "";
    descriptionInput.value = "";
    questForm.reset();
    document.getElementById("image").src = "assets/my_character.jpg";
    activeUserId = nextUserId;

    if (!user) return;

    try {
        const rows = await loadTasks(user.id);
        if (activeUserId !== user.id) return; // switched accounts while loading
        allTasks = rows.map(QuestObject.fromRow);
        renderLists();
    } catch (error) {
        console.error("Could not load tasks:", error);
    }
}

document.addEventListener("questmanager:userChanged", syncTaskSession);

const DIFFICULTY_COLORS = { easy: "#2e7d32", medium: "#1565c0", hard: "#c62828" };

// ---------- Views ----------
const VIEW_MAP = {
    monthly: "dayGridMonth",
    weekly: "timeGridWeek",
    daily: "timeGridDay"
};

// Select a day: update the quest board and highlight the cell.
function selectDate(dateString) {
    selectedDate = dateString;
    renderLists();
    document.querySelectorAll("#calendar .fc-daygrid-day, #calendar .fc-timegrid-col")
        .forEach(el => el.classList.toggle("is-selected", el.dataset.date === selectedDate));
}

// Local YYYY-MM-DD for a Date (no timezone shift)
const toDateStr = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Dragging a quest on the calendar changes its date and time.
async function handleEventDrop(info) {
    const task = allTasks.find(t => t.taskID === info.event.id);
    const user = getCurrentUser();
    if (!task || !user || user.id !== task.userID) {
        info.revert();
        return;
    }

    const start = info.event.start;
    const newDate = toDateStr(start);
    const newTime = info.event.allDay
        ? null
        : `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}:00`;

    try {
        await updateTaskSchedule(task.taskID, newDate, newTime);
        task.date = newDate;
        task.time = newTime;
        selectDate(newDate);   // refresh the board and highlight the new day
    } catch (error) {
        console.error(error);
        info.revert();         // snap the quest back
        alert("Couldn't move that quest: " + error.message);
    }
}

function showCalendar() {

    if (!calendar) {
        calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
            eventDisplay: "block",             // timed quests render as colored bars, not dots
            nextDayThreshold: "09:00:00",      // an 11:33pm quest no longer spills into the next day
            editable: true,
            snapDuration: "00:15:00",           // moves in 15-minute steps
            defaultTimedEventDuration: "00:30:00",
            eventDrop: handleEventDrop,
            initialView: "dayGridMonth",
            height: "auto",
            headerToolbar: {
                left: "prev,next today",
                center: "title",
                right: "" //"dayGridMonth,timeGridWeek"; styled pills replace view buttons
            },
                events: (info, success) => success(
                allTasks.map(t => ({
                    editable: !t.completed,
                    id: t.taskID,
                    title: t.title,
                    start: t.time ? `${t.date}T${t.time}` : t.date,
                    allDay: !t.time,
                    backgroundColor: DIFFICULTY_COLORS[t.difficulty],
                    borderColor: DIFFICULTY_COLORS[t.difficulty],
                    textColor: "#fff",
                    classNames: t.completed ? ["completed"] : []
                }))
            ),
            // Weekly/Daily views return a time too ("2026-11-10T09:00:00"), so keep only the date.
            dateClick: info =>  selectDate(info.dateStr.slice(0, 10)),
            // Clicking a quest bar also selects its day.
            eventClick: info => selectDate(info.event.startStr.slice(0, 10)),
            // Keeps the selected day highlighted after changing month or view.
            dayCellClassNames: arg => toDateStr(arg.date) === selectedDate ? ["is-selected"] : [],
            eventDrop: handleEventDrop
        });

        calendar.render();
        new ResizeObserver(() => calendar.updateSize())
            .observe(document.getElementById("calendar"));
    } else {
        calendar.updateSize(); //page is hidden so need to remeasure for the calendar
    }

    renderLists();
}

function syncJournalPage() {
    if (location.hash === "#journal") {
        setTaskFormOpen(false);
        showCalendar();
    }
}

document.querySelectorAll(".calendar-view__pill").forEach(btn => {
    btn.addEventListener("click", () => {
        calendar?.changeView(VIEW_MAP[btn.dataset.view]);
        document.querySelectorAll(".calendar-view__pill")
            .forEach(b => b.classList.toggle("is-active", b === btn));
    });
});

const homePage = document.getElementById("home");
// Open and close the native dialog.
function setTaskFormOpen(open) {
    if (open) {
        if (!getCurrentUser()) return;

        if (!taskForm.open) {
            // On Journal the Home page is hidden, which would hide the dialog too.
            // Keep Home rendered off-screen while the dialog is open.
            if (homePage.hidden) {
                homePage.hidden = false;
                homePage.classList.add("home-offscreen");
            }
            taskForm.showModal();
            input.focus();
        }
    } else if (taskForm.open) {
        taskForm.close();
    }
}

// Runs on Add, the X button, and Escape.
taskForm.addEventListener("close", () => {
    if (homePage.classList.contains("home-offscreen")) {
        homePage.classList.remove("home-offscreen");
        homePage.hidden = true;
    }
    // Return focus to whichever + is visible.
    if (getCurrentUser()) {
        [toggleTaskForm, toggleDayForm]
            .find(btn => btn.getClientRects().length > 0)?.focus();
    }
});

toggleTaskForm.addEventListener("click", () => {
    setTaskFormOpen(true);
});

closeTaskForm.addEventListener("click", () => {
    setTaskFormOpen(false);
});


// ---------- Collapsing priority sections ----------
// Open or close one section.
function setSectionOpen(section, open) {
    const toggle = section.querySelector(".priority-toggle");
    const list = section.querySelector(".priority-list");

    toggle.setAttribute("aria-expanded", String(open));
    list.hidden = !open;
    section.classList.toggle("is-collapsed", !open);
}

// Clicking a header flips its section.
priorityBoard.querySelectorAll(".priority-toggle").forEach(toggle => {
    toggle.addEventListener("click", () => {
        const section = toggle.closest(".priority-section");
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        setSectionOpen(section, !isOpen);
    });
});
// Redraw the board when a different task type is picked.
typeFilter.addEventListener("change", renderPriorityBoard);
// ---------- Wiring ----------
questForm.addEventListener("submit", event => {
    event.preventDefault();
    addTask();
});

/*toggleDayForm.addEventListener("click", () => {
    if (!getCurrentUser()) return;
    const open = dayForm.hidden;
    dayForm.hidden = !open;
    toggleDayForm.setAttribute("aria-expanded", String(open));
    toggleDayForm.textContent = open ? "−" : "+";
    if (open) document.getElementById("dayTaskInput").focus();
});*/

/*document.getElementById("dayTaskInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("dayAddButton").click();
});*/

["questDueDate", "questDueTime"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("click", (event) => {
        const rect = el.getBoundingClientRect();
        const clickedIcon = event.clientX > rect.right - 40;   // right edge, where the icon sits
        if (clickedIcon) {
            try { el.showPicker(); } catch { /* unsupported browser: ignore */ }
        }
    });
});

// Journal +: open the same New Quest dialog, with the selected date filled in.
toggleDayForm.addEventListener("click", () => {
    if (!getCurrentUser()) return;
    document.getElementById("questDueDate").value = selectedDate;
    setTaskFormOpen(true);
});

toggleTaskForm.addEventListener("click", () => {
    document.getElementById("questDueDate").value = "";   // empty means today
    setTaskFormOpen(true);
});

/*document.getElementById("dayAddButton")?.addEventListener("click", addDayTask);*/
window.addEventListener("hashchange", syncJournalPage);

syncJournalPage();
syncTaskSession();
initLogin();
