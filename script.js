import { initLogin } from "./login.js";
import { getCurrentUser } from "./userSession.js";


var input = document.getElementById("taskInput");
var list = document.getElementById("taskList");

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
        if (checkbox.checked) {
            text.classList.add("completed");
        } else {
            text.classList.remove("completed");
        }
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

function showTasks(){
    document.getElementById("tasksView").style.display = "block";
    document.getElementById("calenderView").style.display = "none";
}

function showCalender(){
    document.getElementById("tasksView").style.display = "block";
    document.getElementById("calenderView").style.display = "none";
}


document.getElementById("addButton").addEventListener("click", addTask);

window.addEventListener("hashchange", route);

initLogin();
route();
