// Avatar creator. Opens by itself the first time a signed-in user has no saved
// look, and again from Customize > "Edit look".

import { getCurrentUser, setCurrentAppearance } from "../users/userSession.js";
import { saveAppearance } from "../users/playerData.js";
import { renderStage } from "../customize/avatar/stage.js";
import {
    SKINS, HAIR_STYLES, HAIR_COLORS, EYES,
    DEFAULT_APPEARANCE, normalizeAppearance, randomAppearance
} from "../customize/avatar/appearance.js";

const dialog = document.getElementById("onboardingDialog");

let draft = { ...DEFAULT_APPEARANCE };
let firstTime = false;     // true = no Cancel button, the user has to pick a look
let saving = false;
let errorText = "";
let askedFor = null;       // user id we already opened the dialog for this page load

function swatch(group, option, selected) {
    return `
        <button class="onb-swatch ${selected ? "is-selected" : ""}" type="button"
                style="--swatch:${option.color}" data-onb="${group}" data-value="${option.id}"
                aria-pressed="${selected}" aria-label="${option.label}" title="${option.label}"></button>`;
}

function hairStyleButton(option) {
    const selected = draft.hairStyle === option.id;
    return `
        <button class="onb-style ${selected ? "is-selected" : ""}" type="button"
                data-onb="hairStyle" data-value="${option.id}"
                aria-pressed="${selected}" aria-label="${option.label}">
            <span class="onb-thumb" data-thumb-style="${option.id}"></span>
        </button>`;
}

function draw() {
    dialog.innerHTML = `
        <form method="dialog" class="onb-form" id="onboardingForm">
            <h2 id="onboardingTitle">${firstTime ? "Create your Hero:" : "Edit your look"}</h2>
            <p class="onb-sub">${firstTime ? "Pick how your character looks. You can change it any time in Customize." : "Pick how your character looks."}</p>

            <div class="onb-layout">
                <div class="onb-preview">
                    <div class="onb-stage" id="onboardingStage"></div>
                    <button class="btn btn-outline-secondary btn-sm" type="button" data-onb-random>Randomize</button>
                </div>

                <div class="onb-options">
                    <fieldset>
                        <legend>Skin</legend>
                        <div class="onb-row">${SKINS.map((o) => swatch("skin", o, draft.skin === o.id)).join("")}</div>
                    </fieldset>
                    <fieldset>
                        <legend>Hair style</legend>
                        <div class="onb-row">${HAIR_STYLES.map(hairStyleButton).join("")}</div>
                    </fieldset>
                    <fieldset>
                        <legend>Hair color</legend>
                        <div class="onb-row">${HAIR_COLORS.map((o) => swatch("hairColor", o, draft.hairColor === o.id)).join("")}</div>
                    </fieldset>
                    <fieldset>
                        <legend>Eyes</legend>
                        <div class="onb-row">${EYES.map((o) => swatch("eyes", o, draft.eyes === o.id)).join("")}</div>
                    </fieldset>
                </div>
            </div>

            <p class="onb-error" role="alert">${errorText}</p>

            <div class="onb-actions">
                ${firstTime ? "" : `<button class="btn btn-outline-secondary" type="button" data-onb-cancel>Cancel</button>`}
                <button class="btn btn-primary" type="submit" ${saving ? "disabled" : ""}>
                    ${saving ? "Saving..." : firstTime ? "Start my adventure" : "Save"}
                </button>
            </div>
        </form>`;

    renderStage(document.getElementById("onboardingStage"), "avatar", [], "Your avatar preview", true, draft);
    dialog.querySelectorAll("[data-thumb-style]").forEach((thumb) => {
        renderStage(thumb, "avatar", [], "", true, { ...draft, hairStyle: Number(thumb.dataset.thumbStyle) });
    });
}

export function openOnboarding(isFirstTime = false) {
    const user = getCurrentUser();
    if (!user || dialog.open) return;
    firstTime = isFirstTime;
    saving = false;
    errorText = "";
    draft = normalizeAppearance(user.appearance) ?? { ...DEFAULT_APPEARANCE };
    draw();
    dialog.showModal();
}

async function save(event) {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user || saving) return;

    saving = true;
    errorText = "";
    draw();
    try {
        await saveAppearance(draft);
        setCurrentAppearance(draft);
        dialog.close();
    } catch (error) {
        console.error(error);
        errorText = "Couldn't save your look: " + error.message;
    }
    saving = false;
    if (dialog.open) draw();
}

dialog.addEventListener("submit", save);

dialog.addEventListener("click", (event) => {
    if (saving) return;

    const choice = event.target.closest("[data-onb]");
    if (choice) {
        const group = choice.dataset.onb;
        const raw = choice.dataset.value;
        draft[group] = group === "hairColor" ? raw : Number(raw);
        draw();
        return;
    }
    if (event.target.closest("[data-onb-random]")) {
        draft = randomAppearance();
        draw();
        return;
    }
    if (event.target.closest("[data-onb-cancel]")) dialog.close();
});

// First-time users must finish; Esc only works when editing.
dialog.addEventListener("cancel", (event) => {
    if (firstTime || saving) event.preventDefault();
});

// Open automatically for a signed-in user who has never picked a look.
document.addEventListener("questmanager:userChanged", () => {
    const user = getCurrentUser();
    if (!user) {
        askedFor = null;
        if (dialog.open) dialog.close();
        return;
    }
    if (!user.appearance && askedFor !== user.id) {
        askedFor = user.id;
        openOnboarding(true);
    }
});

document.addEventListener("questmanager:editLook", () => openOnboarding(false));
