import { initLogin } from "./login.js";

var counter = document.getElementById("counter");
var completedCount = 0;
var input = document.getElementById("taskInput");
var list = document.getElementById("taskList");

input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        document.getElementById("addButton").click();
    }
});

function addTask() {
    if (input.value.trim() === "") {
        return;
    }
    var li = document.createElement("li");
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    var text = document.createElement("span");
    text.textContent = " " + input.value;

    checkbox.onclick = function() {
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
document.getElementById("buySword").addEventListener("click", addSword);

window.addEventListener("hashchange", route);

initLogin();
route();
