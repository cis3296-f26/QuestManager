import { initLogin } from "./users/login.js";
import { getCurrentUser, refreshCurrentUser } from "./users/userSession.js";
import { QuestObject, PRIORITIES } from "./quests/questObject.js";
import { loadTasks, createTask, completeTask, updateTaskSchedule, updateTask, deleteTask } from "./users/playerData.js";

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
let editingTask = null; // the quest open in the dialog, or null when adding a new one

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
                tasks.forEach(t => {
            renderTask(t, target);
            // Only the quest's owner can change it, so only they can drag it.
            const li = target.lastElementChild;
            const user = getCurrentUser();
            if (li && user && user.id === t.userID) {
                li.draggable = true;
                li.dataset.taskId = t.taskID;
                li.addEventListener("dragstart", event => {
                    event.dataTransfer.setData("text/plain", String(t.taskID));
                    event.dataTransfer.effectAllowed = "move";
                    li.classList.add("is-dragging");
                });
                li.addEventListener("dragend", () => li.classList.remove("is-dragging"));
            }
        });
        section.querySelector(".priority-count").textContent = tasks.length;
    });
}
// Redraws the checklist (today), the day panel (selected date) and the calendar.
function renderLists() {
    renderPriorityBoard();
    renderMissedBanner();

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
    difficulty.textContent = "Difficulty: " +
        task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1);
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

    // Edit / Delete, only for the account that owns the quest.
    const user = getCurrentUser();
    if (user && user.id === task.userID) {
        const actions = document.createElement("div");
        actions.className = "quest-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "quest-edit";
        editButton.textContent = "Edit";
        editButton.setAttribute("aria-label", "Edit quest: " + task.title);
        editButton.addEventListener("click", () => openEditForm(task));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "quest-delete";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", "Delete quest: " + task.title);
        deleteButton.addEventListener("click", () => removeTask(task, deleteButton));

        actions.append(editButton, deleteButton);
        li.appendChild(actions);
    }

    target.appendChild(li);
}

// ---------- Missed quests ----------
// Unfinished quests from earlier days. The board only shows today, so without
// this they would disappear from view.
const missedBanner = document.getElementById("missedBanner");
const missedText = document.getElementById("missedText");
const missedList = document.getElementById("missedList");
const missedToggle = document.getElementById("missedToggle");
const missedMoveAll = document.getElementById("missedMoveAll");

function getMissedTasks() {
    const user = getCurrentUser();
    if (!user) return [];
    const today = todayStr();
    // Dates are YYYY-MM-DD strings, so comparing them as text works.
    return allTasks.filter(t =>
        t.userID === user.id && !t.completed && t.date && t.date < today);
}

function renderMissedBanner() {
    if (!missedBanner) return;
    const missed = getMissedTasks();
    missedBanner.hidden = missed.length === 0;
    if (missed.length === 0) return;

    missedText.textContent = `⚠️ ${missed.length} missed quest${missed.length > 1 ? "s" : ""}`;
    missedList.replaceChildren();
    missed.forEach(t => renderTask(t, missedList));
}

missedToggle?.addEventListener("click", () => {
    const show = missedList.hidden;
    missedList.hidden = !show;
    missedToggle.textContent = show ? "Hide" : "View";
    missedToggle.setAttribute("aria-expanded", String(show));
});

missedMoveAll?.addEventListener("click", async () => {
    const missed = getMissedTasks();
    if (missed.length === 0) return;
    missedMoveAll.disabled = true;
    try {
        for (const task of missed) {
            const row = await updateTask(task.taskID, { task_date: todayStr() });
            const updated = QuestObject.fromRow(row);
            allTasks = allTasks.map(t => t.taskID === task.taskID ? updated : t);
        }
        renderLists();
    } catch (error) {
        console.error(error);
        alert("Couldn't move your missed quests: " + error.message);
    } finally {
        missedMoveAll.disabled = false;
    }
});

// ---------- Form errors ----------
const questFormError = document.getElementById("questFormError");
const dueDateInput = document.getElementById("questDueDate");

function showFormError(message, field) {
    questFormError.textContent = message;
    questFormError.hidden = false;
    field?.focus();
}

function clearFormError() {
    questFormError.textContent = "";
    questFormError.hidden = true;
}

// ---------- Adding tasks ----------
async function addTaskFor(title, difficulty, date, description = "", time = null, priority = "Medium", taskType = "personal") {
    // Save the description alongside the other task details.
    const row = await createTask(title, description, difficulty, date, time, priority, taskType);
    allTasks.push(QuestObject.fromRow(row));
    renderLists();
}

async function addTask() {
    const user = getCurrentUser();
    if (!user || addButton.disabled) return;
    if (editingTask) return saveEdits();
    clearFormError();

    const title = input.value.trim();
    if (title === "") {
        showFormError("Your quest needs a name.", input);
        return;
    }
    const pickedDate = dueDateInput.value;
    if (pickedDate && pickedDate < todayStr()) {
        showFormError("The due date can't be in the past.", dueDateInput);
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

// ---------- Editing tasks ----------
// Opens the quest dialog filled in with an existing quest.
function openEditForm(task) {
    const user = getCurrentUser();
    if (!user || user.id !== task.userID) return;

    editingTask = task;
    input.value = task.title;
    descriptionInput.value = task.description || "";
    document.getElementById("questDueDate").value = task.date || "";
    document.getElementById("questDueTime").value = task.time ? task.time.slice(0, 5) : "";
    typeInput.value = task.taskType;
    priorityInput.value = task.priority;
    difficultyInputs.forEach(radio => {
        radio.checked = radio.value === task.difficulty;
        // The reward is already paid, so its difficulty can't change any more.
        radio.disabled = task.rewarded;
    });

    // Allow keeping an older date, but not picking a new past one.
    dueDateInput.min = task.date && task.date < todayStr() ? task.date : todayStr();
    document.getElementById("questFormTitle").textContent = "Edit Quest";
    addButton.textContent = "Save Changes";
    setTaskFormOpen(true);
}

// Puts the dialog back into "New Quest" mode.
function resetFormMode() {
    if (!editingTask) return;
    editingTask = null;
    questForm.reset();
    difficultyInputs.forEach(radio => { radio.disabled = !getCurrentUser(); });
    document.getElementById("questFormTitle").textContent = "New Quest";
    addButton.textContent = "Add Quest";
}

async function saveEdits() {
    const task = editingTask;
    clearFormError();
    const title = input.value.trim();
    if (title === "") {
        showFormError("Your quest needs a name.", input);
        return;
    }
    // Only check the date if it was changed, so an overdue quest can still be edited.
    const pickedDate = dueDateInput.value;
    if (pickedDate && pickedDate !== task.date && pickedDate < todayStr()) {
        showFormError("The due date can't be in the past.", dueDateInput);
        return;
    }

    const fields = {
        title,
        description: descriptionInput.value.trim(),
        task_date: document.getElementById("questDueDate").value || task.date || todayStr(),
        task_time: document.getElementById("questDueTime").value || null,
        priority: priorityInput.value,
        task_type: typeInput.value
    };
    if (!task.rewarded) {
        fields.difficulty = questForm.querySelector('input[name="difficulty"]:checked').value;
    }

    addButton.disabled = true;
    try {
        const row = await updateTask(task.taskID, fields);
        const updated = QuestObject.fromRow(row);
        allTasks = allTasks.map(t => t.taskID === task.taskID ? updated : t);
        setTaskFormOpen(false);   // the close handler switches back to New Quest mode
        renderLists();
    } catch (error) {
        console.error(error);
        alert("Couldn't save your changes: " + error.message);
    } finally {
        addButton.disabled = !getCurrentUser();
    }
}

// ---------- Deleting tasks ----------
async function removeTask(task, button) {
    const user = getCurrentUser();
    if (!user || user.id !== task.userID) return;
    if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;

    button.disabled = true;
    try {
        await deleteTask(task.taskID);
        allTasks = allTasks.filter(t => t.taskID !== task.taskID);
        if (editingTask?.taskID === task.taskID) setTaskFormOpen(false);
        renderLists();
    } catch (error) {
        console.error(error);
        button.disabled = false;
        alert("Couldn't delete that quest: " + error.message);
    }
}

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
    resetFormMode();
    allTasks = [];
    renderLists();
    input.value = "";
    descriptionInput.value = "";
    questForm.reset();
    // The old #image element was removed from the page, so only reset it if it exists.
    const characterImage = document.getElementById("image");
    if (characterImage) characterImage.src = "assets/my_character.jpg";
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
            if (!editingTask) dueDateInput.min = todayStr();
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
    clearFormError();
    resetFormMode();
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
// ---------- Drag a quest to another priority ----------
async function changePriority(taskId, priority) {
    const task = allTasks.find(t => String(t.taskID) === String(taskId));
    if (!task || task.priority === priority) return;

    try {
        const row = await updateTask(task.taskID, { priority });
        const updated = QuestObject.fromRow(row);
        allTasks = allTasks.map(t => t.taskID === task.taskID ? updated : t);
    } catch (error) {
        console.error(error);
        alert("Couldn't move that quest: " + error.message);
    }
    renderLists();
}

priorityBoard.querySelectorAll(".priority-section").forEach(section => {
    section.addEventListener("dragover", event => {
        event.preventDefault();                       // allow dropping here
        event.dataTransfer.dropEffect = "move";
        section.classList.add("is-drop-target");
    });
    section.addEventListener("dragleave", event => {
        if (!section.contains(event.relatedTarget)) section.classList.remove("is-drop-target");
    });
    section.addEventListener("drop", event => {
        event.preventDefault();
        section.classList.remove("is-drop-target");
        changePriority(event.dataTransfer.getData("text/plain"), section.dataset.priority);
    });
});
// ---------- Wiring ----------
questForm.addEventListener("submit", event => {
    event.preventDefault();
    addTask();
});

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
