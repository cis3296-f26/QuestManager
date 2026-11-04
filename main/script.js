import { initLogin } from "./users/login.js";
import { getCurrentUser, refreshCurrentUser } from "./users/userSession.js";
import { QuestObject } from "./quests/questObject.js";
import { loadTasks, createTask, completeTask } from "./users/playerData.js";

// Routing first, so the tabs work even if something below fails
function route() {
    let page = location.hash.replace("#", "") || "home";
    if (!document.getElementById(page)) page = "home";

    document.querySelectorAll(".page").forEach(function(p) {
        p.hidden = p.id !== page;
    });

    document.querySelectorAll("#mainNav .nav-link").forEach(function(link) {
        link.classList.toggle("active", link.getAttribute("href") === "#" + page);
    });
}
window.addEventListener("hashchange", route);
route();


var input = document.getElementById("taskInput");
var list = document.getElementById("taskList");
var addButton = document.getElementById("addButton");
var difficultySelect = document.getElementById("difficultySelect");
var calendar = null;

// Track account changes so repeated auth events don't erase current tasks.
let activeUserId = null;

async function syncTaskSession() {
    const user = getCurrentUser();
    const nextUserId = user?.id ?? null;

    addButton.disabled = !user;
    list.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.disabled = !user || checkbox.dataset.rewarded === "true";
    });

    // Same account (e.g. a balance refresh): keep the list as it is.
    if (nextUserId === activeUserId) return;

    // Clear the previous account
    list.replaceChildren();
    input.value = "";
    document.getElementById("image").src = "assets/my_character.jpg";
    activeUserId = nextUserId;

    if (!user) return;

    try {
        const rows = await loadTasks(user.id);
        if (activeUserId !== user.id) return; // switched accounts while loading
        rows.map(QuestObject.fromRow).forEach(renderTask);
    } catch (error) {
        console.error("Could not load tasks:", error);
    }
}

input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        addButton.click();
    }
});

// Draw one task. Used for new tasks and for tasks loaded from the database.
function renderTask(task) {
    var li = document.createElement("li");
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.disabled = task.rewarded;
    checkbox.dataset.rewarded = String(task.rewarded);

    var text = document.createElement("span");
    text.textContent = " " + task.title + " (" + task.difficulty + ")";
    text.classList.toggle("completed", task.completed);

    checkbox.onclick = async function() {

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
            checkbox.dataset.rewarded = "true";
            text.classList.add("completed");
            await refreshCurrentUser(); // updates the coin counter and the shop
        } catch (error) {
            console.error(error);
            checkbox.checked = false;
            checkbox.disabled = false;
            alert("Couldn't save that: " + error.message);
        }
    };

    li.appendChild(checkbox);
    li.appendChild(text);
    list.appendChild(li);
}

async function addTask() {

    const user = getCurrentUser();
    if (!user) return;

    const title = input.value.trim();
    if (title === "") return;

    addButton.disabled = true; // stop double-clicks

    try {
        // The database creates the id and fills in user_id.
        const row = await createTask(title, "", difficultySelect.value);
        renderTask(QuestObject.fromRow(row));
        input.value = "";
    } catch (error) {
        console.error(error);
        alert("Couldn't save the task: " + error.message);
    } finally {
        addButton.disabled = !getCurrentUser();
    }
}

document.addEventListener("questmanager:userChanged", syncTaskSession);
syncTaskSession();

///////

function showTasks() {
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
            dateClick: function(info) {
                var title = prompt("Add a task for " + info.dateStr + ":");
                if (title) calendar.addEvent({ title: title, start: info.dateStr });
            }
        });
    }
    calendar.render();
}

addButton.addEventListener("click", addTask);
document.getElementById("todoButton")?.addEventListener("click", showTasks);
document.getElementById("calendarButton")?.addEventListener("click", showCalendar);

initLogin();
