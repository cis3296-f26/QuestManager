import { supabase } from "./supabaseClient.js"; //Supabase client iimport
console.log("script.js started");
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
    img.src = "with_shield.jpg";
    img.className = "img-fluid";
}

function route() {
    var page = location.hash.replace("#", "") || "home";
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