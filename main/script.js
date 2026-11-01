import { initLogin } from "./users/login.js";
import { getCurrentUser } from "./users/userSession.js";
import { QuestObject } from "./quests/questObject.js";

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
var calendar = null;

// Track account changes so repeated auth events don't erase current tasks.
let activeUserId = null;

function syncTaskSession() {
    const user = getCurrentUser();
    const nextUserId = user?.id ?? null;

    if (nextUserId !== activeUserId) {
        // Clear the previous account's temporary tasks and character display.
        list.replaceChildren();
        input.value = "";
        document.getElementById("image").src = "assets/my_character.jpg";
        activeUserId = nextUserId;
    }

    // Tasks require a signed-in account.
    input.disabled = !user;
    document.getElementById("addButton").disabled = !user;
    list.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.disabled = !user;
    });
}

document.addEventListener("questmanager:userChanged", syncTaskSession);
syncTaskSession();

input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        document.getElementById("addButton").click();
    }
});

function addTask() {

    const user = getCurrentUser();
    if (!user) return;

    const title = input.value.trim();
    if (title === "") return;

    // Use easy until the task UI supplies the selected difficulty.
    const task = new QuestObject(
        crypto.randomUUID(),
        user.id,
        title,
        "",
        "easy"
    );

    var li = document.createElement("li");
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    var text = document.createElement("span");
    text.textContent = " " + task.title;

    checkbox.onclick = function() {

        // Only the account that created this task can complete it.
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.id !== task.userID) {
            checkbox.checked = false;
            return;
        }

        text.classList.toggle("completed", checkbox.checked);

        // Retry unpaid tasks, but never request another reward after payment succeeds.
        if (checkbox.checked) {
            task.complete();

            if (!task.rewarded) {
                document.dispatchEvent(new CustomEvent("questmanager:taskCompleted", {
                    detail: { task }
                }));
            }
        }
    };

    li.appendChild(checkbox);
    li.appendChild(text);
    list.appendChild(li);
    input.value = "";
}


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

document.getElementById("addButton")?.addEventListener("click", addTask);
document.getElementById("todoButton")?.addEventListener("click", showTasks);
document.getElementById("calendarButton")?.addEventListener("click", showCalendar);

initLogin();
