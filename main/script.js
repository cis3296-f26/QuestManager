import { initLogin } from "./users/login.js";
import { getCurrentUser, refreshCurrentUser } from "./users/userSession.js";
import { QuestObject } from "./quests/questObject.js";
import { loadTasks, createTask, completeTask } from "./users/playerData.js";

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
var list = document.getElementById("taskList");
var addButton = document.getElementById("addButton");
var difficultySelect = document.getElementById("difficultySelect");
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
// Redraws the checklist (today), the day panel (selected date) and the calendar.
function renderLists() {
    list.replaceChildren();
    allTasks.filter(t => t.date === todayStr()).forEach(t => renderTask(t));

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
function renderTask(task, target = list) {
    var li = document.createElement("li");
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
async function addTaskFor(title, difficulty, date, description = "") {
    // Save the description alongside the other task details.
    const row = await createTask(title, description, difficulty, date);
    allTasks.push(QuestObject.fromRow(row));
    renderLists();
}

async function addTask() {
    const user = getCurrentUser();
    if (!user) return;

    const title = input.value.trim();
    if (title === "") return;

    addButton.disabled = true; // stop double-clicks

    try {
        await addTaskFor(title, difficultySelect.value, todayStr(), descriptionInput.value.trim());
        input.value = "";
        descriptionInput.value = "";
        difficultySelect.value = "easy";
    } catch (error) {
        console.error(error);
        alert("Couldn't save the task: " + error.message);
    } finally {
        addButton.disabled = !getCurrentUser();
    }
}

async function addDayTask() {
    const dayInput = document.getElementById("dayTaskInput");
    const dayButton = document.getElementById("dayAddButton");
    const title = dayInput.value.trim();
    if (!getCurrentUser() || title === "") return;

    dayButton.disabled = true;
    try {
        await addTaskFor(title, "easy", selectedDate);
        dayInput.value = "";
    } catch (error) {
        console.error(error);
        alert("Couldn't save the task: " + error.message);
    } finally {
        dayButton.disabled = !getCurrentUser();
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
    difficultySelect.disabled = !user;
    addButton.disabled = !user;
    toggleTaskForm.disabled = !user;
    const dayInput = document.getElementById("dayTaskInput");
    const dayButton = document.getElementById("dayAddButton");
    if (dayInput) dayInput.disabled = !user;
    if (dayButton) dayButton.disabled = !user;
    if (toggleDayForm) toggleDayForm.disabled = !user;
    document.querySelectorAll("#taskList input[type='checkbox'], #dayTaskList input[type='checkbox']")
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
    difficultySelect.value = "easy";
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

input.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        addButton.click();
    }
});

// ---------- Views ----------
const VIEW_MAP = {
    monthly: "dayGridMonth",
    weekly: "timeGridWeek",
    daily: "timeGridDay"
};

/*
function showTasks() {
    document.getElementById("tasksView").style.display = "block";
    document.getElementById("calendarView").style.display = "none";
}
*/

function showCalendar() {

    // Close the quest form when switching to Calendar.
    // setTaskFormOpen(false); //commenting out temporarily for changes

    // document.getElementById("tasksView").style.display = "none";
    // document.getElementById("calendarView").style.display = "block";

    if (!calendar) {
        calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
            initialView: "dayGridMonth",
            height: "auto",
            headerToolbar: {
                left: "prev,next today",
                center: "title",
                right: "" //"dayGridMonth,timeGridWeek"; styled pills replace view buttons
            },
            events: (info, success) => success(
                allTasks.map(t => ({
                    id: t.taskID, title: t.title, start: t.date, allDay: true,
                    classNames: t.completed ? ["completed"] : []
                }))
            ),
            dateClick: info => {
                selectedDate = info.dateStr;
                renderLists();
            }
        });
        calendar.render();
        new ResizeObserver(() => calendar.updateSize())
            .observe(document.getElementById("calendar"));
    }else{
        calendar.updateSize(); //page is hidden so need to remeasure for the calendar
    }
    
    renderLists();
}

function syncJournalPage(){
    if(location.hash === "#journal") showCalendar();
}

document.querySelectorAll(".calendar-view__pill").forEach(btn => {
    btn.addEventListener("click", () => {
        calendar?.changeView(VIEW_MAP[btn.dataset.view]);
        document.querySelectorAll(".calendar-view__pill")
            .forEach(b => b.classList.toggle("is-active", b === btn));
    });
});

// Keep the form visibility and accessible button label in sync.
function setTaskFormOpen(open) {
    taskForm.hidden = !open;
    toggleTaskForm.setAttribute("aria-expanded", String(open));
    toggleTaskForm.setAttribute(
        "aria-label",
        open ? "Close quest form" : "Add a quest"
    );
    toggleTaskForm.textContent = open ? "−" : "+";
}

toggleTaskForm.addEventListener("click", () => {
    if (!getCurrentUser()) return;

    // // The entry form lives in the To-Do view.
    // const calendarShowing =
    //     document.getElementById("tasksView").style.display === "none";

    // showTasks();
    const open =  taskForm.hidden; //calendarShowing || taskForm.hidden;
    setTaskFormOpen(open);
    if (open) input.focus();
});




// ---------- Wiring ----------
toggleDayForm.addEventListener("click", () => {
    if (!getCurrentUser()) return;
    const open = dayForm.hidden;
    dayForm.hidden = !open;
    toggleDayForm.setAttribute("aria-expanded", String(open));
    toggleDayForm.textContent = open ? "−" : "+";
    if (open) document.getElementById("dayTaskInput").focus();
});

document.getElementById("dayTaskInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("dayAddButton").click();
});


addButton.addEventListener("click", addTask);
document.getElementById("dayAddButton")?.addEventListener("click", addDayTask);
window.addEventListener("hashchange", syncJournalPage);
syncJournalPage();
//document.getElementById("todoButton")?.addEventListener("click", showTasks);
//document.getElementById("calendarButton")?.addEventListener("click", showCalendar);

syncTaskSession();
initLogin();