// Tutorial: a short illustrated story, then a guided tour that spotlights the
// real parts of the page. New players have to finish it once (right after they
// create their hero). Anyone can replay it from the "How to play" button.

import { getCurrentUser, markTutorialDone } from "../users/userSession.js";
import { saveTutorialDone } from "../users/playerData.js";
import { renderStage } from "../customize/avatar/stage.js";

// Shop items the story shows the hero wearing ("this is what you can earn").
const GEAR_PREVIEW = ["gold_crown", "soldier", "sword"];

// Story panels: a big picture plus narration.
const STORY = [
    {
        art: "room",
        title: (name) => `Welcome, ${name}!`,
        text: "This is you, in your room. Right now you're a beginner hero, and that's fine. Every hero starts somewhere."
    },
    {
        art: "map",
        title: () => "The ten lands",
        text: "Out there, ten lands lead up to the Volcano Castle, where the Ember Warden is waiting. You're not ready for that fight yet."
    },
    {
        art: "gear",
        title: () => "Train in real life",
        text: "Your real-life to-dos are your quests. Finish them to earn coins, then spend the coins on gear like this. Let me show you around."
    }
];

// Guided tour: each step spotlights a real element on the page.
// Steps whose element isn't on screen (like Missed Quests for a new player) are skipped.
const TOUR = [
    {
        target: "#toggleTaskForm",
        title: "Add a quest",
        text: "Press + to add a quest. Give it a due date, type, priority and difficulty. Harder quests pay more coins."
    },
    {
        target: "#priorityBoard",
        title: "Your Quest Board",
        text: "Today's quests land here, sorted into High, Medium and Low. Check one off when it's done to earn coins, or drag it to change its priority."
    },
    {
        target: "#missedBanner",
        title: "Missed Quests",
        text: "Quests you didn't finish on earlier days wait here. Finish them or move them all to today."
    },
    {
        target: '#mainNav a[href="#journal"]',
        title: "Your Journal",
        text: "See all your quests on a calendar, drag them to other days, and look back at everything you've finished."
    },
    {
        target: '#mainNav a[href="#shop"]',
        title: "The Shop",
        text: "Spend your coins on hats, armor, weapons, wallpaper and flooring."
    },
    {
        target: '#mainNav a[href="#customize"]',
        title: "Customize",
        text: "Put on the gear you bought, decorate your room, or change your look."
    },
    {
        target: '#mainNav a[href="./game/"]',
        title: "Adventure",
        text: "When you're ready, take your hero across the ten lands, grab the gold coins in every level, and face the Ember Warden."
    },
    {
        target: "#howToPlayButton",
        title: "Need a refresher?",
        text: "You can open this tutorial again any time from How to play."
    }
];

const FINISH = {
    art: "ready",
    title: (name) => `You're ready, ${name}!`,
    text: "Your first quest is waiting. Add it now, or look around first."
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let dlg = null;        // the tutorial <dialog>, built the first time it's needed
let steps = [];
let index = 0;
let required = false;  // true = first time: no Skip, Esc does nothing
let running = false;
let typing = null;     // typewriter timer

// ---------- Building the dialog ----------

function build() {
    dlg = document.createElement("dialog");
    dlg.className = "tut";
    dlg.setAttribute("aria-labelledby", "tutTitle");
    dlg.innerHTML = `
        <div class="tut-spot" hidden></div>
        <section class="tut-card">
            <div class="tut-art"></div>
            <div class="tut-head">
                <div class="tut-portrait avatar-stage" aria-hidden="true"></div>
                <h2 class="tut-title" id="tutTitle"></h2>
                <span class="tut-count"></span>
            </div>
            <p class="tut-text">
                <span class="visually-hidden tut-full"></span>
                <span class="tut-typed" aria-hidden="true"></span>
            </p>
            <div class="tut-foot">
                <div class="tut-dots" aria-hidden="true"></div>
                <button class="tut-skip" type="button" data-tut="skip">Skip tutorial</button>
                <button class="tut-btn tut-back" type="button" data-tut="back">Back</button>
                <button class="tut-btn tut-alt" type="button" data-tut="done">Look around first</button>
                <button class="tut-btn tut-next" type="button" data-tut="next">Next</button>
            </div>
        </section>`;
    document.body.appendChild(dlg);

    dlg.addEventListener("click", onClick);
    dlg.addEventListener("keydown", onKey);
    dlg.addEventListener("cancel", (event) => {
        event.preventDefault();          // Esc only closes a replay, never the first run
        if (!required) finish(false);
    });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
}

const $ = (selector) => dlg.querySelector(selector);

// Gear the player owns and has equipped (same rule as the Home character).
function ownedEquipped(user) {
    if (!user) return [];
    return (user.equipped || []).filter((id) => (user.inventory || []).includes(id));
}

// The picture at the top of a story panel.
function drawArt(kind, user) {
    const art = $(".tut-art");
    art.className = "tut-art tut-art-" + kind;
    art.replaceChildren();

    if (kind === "map") {
        // The adventure map with a pulsing ring on the Volcano Castle and a "You" pin at level 1.
        art.innerHTML = `
            <span class="tut-pin tut-pin-castle" aria-hidden="true"></span>
            <span class="tut-pin tut-pin-you" aria-hidden="true">You</span>`;
        art.setAttribute("role", "img");
        art.setAttribute("aria-label", "Adventure map with ten lands leading to the Volcano Castle");
        return;
    }

    // Room + hero, drawn with the same sprites as the Home tab.
    const scene = document.createElement("div");
    scene.className = "tut-scene";
    const room = document.createElement("div");
    room.className = "avatar-stage";
    const hero = document.createElement("div");
    hero.className = "avatar-stage";
    scene.append(room, hero);
    art.append(scene);

    const owned = ownedEquipped(user);
    renderStage(room, "room", owned, "");
    renderStage(hero, "avatar", kind === "gear" ? GEAR_PREVIEW : owned, "Your hero", true, user?.appearance);

    if (kind === "gear" || kind === "ready") {
        for (let i = 0; i < 5; i++) {
            const star = document.createElement("span");
            star.className = "tut-sparkle";
            star.textContent = "✦";
            star.setAttribute("aria-hidden", "true");
            art.append(star);
        }
    }
    art.removeAttribute("role");
    art.removeAttribute("aria-label");
}

// Typewriter text, like an RPG dialogue box. Screen readers get the full text at once.
function type(text) {
    clearInterval(typing);
    typing = null;
    $(".tut-full").textContent = text;
    const out = $(".tut-typed");
    if (reduceMotion) {
        out.textContent = text;
        return;
    }
    let shown = 0;
    out.textContent = "";
    typing = setInterval(() => {
        shown += 2;
        out.textContent = text.slice(0, shown);
        if (shown >= text.length) {
            clearInterval(typing);
            typing = null;
        }
    }, 16);
}

function finishTyping() {
    clearInterval(typing);
    typing = null;
    $(".tut-typed").textContent = $(".tut-full").textContent;
}

// ---------- Showing a step ----------

function show(i) {
    index = i;
    const step = steps[i];
    const user = getCurrentUser();
    const name = user?.username || "hero";
    const touring = step.kind === "tour";

    dlg.classList.toggle("is-touring", touring);
    const card = $(".tut-card");
    card.classList.toggle("is-anchored", touring);
    card.classList.toggle("is-centered", !touring);
    if (!touring) {
        card.style.left = "";
        card.style.top = "";
        card.dataset.side = "";
    }

    // Story and finish panels get a picture; tour steps get a small portrait instead.
    $(".tut-art").hidden = touring;
    if (!touring) drawArt(step.art, user);
    const portrait = $(".tut-portrait");
    portrait.hidden = !touring;
    if (touring) renderStage(portrait, "avatar", ownedEquipped(user), "", true, user?.appearance);

    $(".tut-title").textContent = typeof step.title === "function" ? step.title(name) : step.title;
    $(".tut-count").textContent = `${i + 1} / ${steps.length}`;
    $(".tut-dots").innerHTML = steps
        .map((_, n) => `<span class="tut-dot ${n === i ? "is-active" : n < i ? "is-done" : ""}"></span>`)
        .join("");

    const finishing = step.kind === "finish";
    $(".tut-back").hidden = i === 0;
    $(".tut-skip").hidden = required || finishing;
    $(".tut-alt").hidden = !finishing;
    $(".tut-next").textContent = finishing
        ? "Add my first quest"
        : step.kind === "story" && steps[i + 1]?.kind !== "story"
            ? "Show me around"
            : "Next";

    type(step.text);

    if (touring) {
        const target = document.querySelector(step.target);
        const rect = target.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            target.scrollIntoView({ block: rect.height > window.innerHeight * 0.6 ? "start" : "center" });
        }
    } else {
        $(".tut-spot").hidden = true;
    }
    requestAnimationFrame(place);
    $(".tut-next").focus();
}

// Moves the spotlight onto the step's element and puts the card next to it.
function place() {
    if (!dlg?.open) return;
    const step = steps[index];
    if (step.kind !== "tour") return;
    const target = document.querySelector(step.target);
    if (!target) return;

    const spot = $(".tut-spot");
    const card = $(".tut-card");
    const r = target.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;
    const top = Math.max(r.top - pad, 8);
    const bottom = Math.min(r.bottom + pad, vh - 8);

    spot.hidden = false;
    spot.style.left = `${r.left - pad}px`;
    spot.style.top = `${top}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${Math.max(bottom - top, 0)}px`;

    // Small screens: the card docks at the bottom (CSS), no arrow.
    if (vw < 640) {
        card.dataset.side = "dock";
        card.style.left = "";
        card.style.top = "";
        return;
    }

    const gap = 18;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    let side = "below";
    let y = bottom + gap;
    if (y + ch > vh - 8) {
        side = "above";
        y = top - gap - ch;
    }
    if (y < 8) {
        side = "inside";            // element fills the screen: card sits at the bottom
        y = vh - ch - 16;
    }
    const centerX = r.left + r.width / 2;
    const x = Math.min(Math.max(centerX - cw / 2, 12), vw - cw - 12);

    card.dataset.side = side;
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.setProperty("--arrow-x", `${Math.min(Math.max(centerX - x, 28), cw - 28)}px`);
}

// ---------- Buttons and keys ----------

function next() {
    if (typing) return finishTyping();      // first click finishes the sentence
    if (steps[index].kind === "finish") return finish(true);
    show(index + 1);
}

function back() {
    if (index > 0) show(index - 1);
}

function onClick(event) {
    const button = event.target.closest("[data-tut]");
    if (!button) return;
    const action = button.dataset.tut;
    if (action === "next") next();
    else if (action === "back") back();
    else if (action === "done") finish(false);
    else if (action === "skip" && !required) finish(false);
}

function onKey(event) {
    if (event.key === "ArrowRight") next();
    if (event.key === "ArrowLeft") back();
}

// ---------- Start and finish ----------

function isOnScreen(element) {
    return Boolean(element) && element.getClientRects().length > 0 && !element.closest("[hidden]");
}

function close() {
    running = false;
    clearInterval(typing);
    typing = null;
    if (dlg?.open) dlg.close();
}

async function finish(addQuest) {
    const user = getCurrentUser();
    close();
    if (user && !user.tutorialDone) {
        markTutorialDone();
        try {
            await saveTutorialDone();
        } catch (error) {
            // Not fatal: they'll just see the tutorial again next time they sign in.
            console.error("Could not save tutorial progress:", error);
        }
    }
    if (addQuest) document.getElementById("toggleTaskForm")?.click();
}

// Starts the tutorial on the Home tab. mustFinish = true for a player's first time.
export function startTutorial({ mustFinish = false } = {}) {
    if (!getCurrentUser() || running) return;
    running = true;
    required = mustFinish;
    if (!dlg) build();
    if (location.hash && location.hash !== "#home") location.hash = "#home";

    // Give the router a moment to show Home before measuring anything.
    setTimeout(() => {
        if (!running) return;
        steps = [
            ...STORY.map((step) => ({ kind: "story", ...step })),
            ...TOUR.filter((step) => isOnScreen(document.querySelector(step.target)))
                .map((step) => ({ kind: "tour", ...step })),
            { kind: "finish", ...FINISH }
        ];
        dlg.classList.toggle("is-required", required);
        dlg.showModal();
        show(0);
    }, 80);
}

// Signing out closes it.
document.addEventListener("questmanager:userChanged", () => {
    if (!getCurrentUser() && running) close();
});
