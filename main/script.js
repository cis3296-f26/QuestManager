import { initLogin } from "./users/login.js";
import { getCurrentUser } from "./users/userSession.js";


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

    // Also check here so code cannot add tasks while signed out.
    if (!getCurrentUser()) return;

    if (input.value.trim() === "") {
        return;
    }
    var li = document.createElement("li");
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    var text = document.createElement("span");
    text.textContent = " " + input.value;

    checkbox.onclick = function() {

        // Stop completion before the task can be marked rewarded.
        if (!getCurrentUser()) {
            checkbox.checked = false;
            return;
        }

        text.classList.toggle("completed", checkbox.checked);

        // Reward each task only once, even if it is unchecked and checked again.
        if (checkbox.checked && li.dataset.rewarded !== "true") {
            li.dataset.rewarded = "true";
            document.dispatchEvent(new CustomEvent("questmanager:taskCompleted", {
                detail: { taskName: text.textContent.trim() }
            }));
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
