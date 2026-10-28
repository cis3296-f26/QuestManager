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
        completedCount = list.querySelectorAll('input[type="checkbox"]:checked').length;
        counter.textContent = completedCount;
    };

    li.appendChild(checkbox);
    li.appendChild(text);
    list.appendChild(li);
    input.value = "";
}

function addSword() {
    if (completedCount <= 0) {
        alert("You need at least 1 task point to unlock the sword!");
        return;
    }
    completedCount--;
    counter.textContent = completedCount;
    var img = document.getElementById("image");
    img.src = "assets/with_sword.jpg";
    img.className = "img-fluid";
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


document.getElementById("addButton").addEventListener("click", addTask);
document.getElementById("buySword").addEventListener("click", addSword);

window.addEventListener("hashchange", route);
route();

var calendar = null;

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
                if (title) {
                    calendar.addEvent({ title: title, start: info.dateStr });
                }
            }
        });
    }
    calendar.render();
}

initLogin();
route();
