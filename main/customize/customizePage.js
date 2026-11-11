// Customize tab: Inventory (always on the left) + a showcase on the right
// that switches between the Wardrobe (avatar) and the Room.
// The quest sidebar is tucked into a pull-out drawer on this tab.

import { getCurrentUser, refreshCurrentUser, setCurrentEquipped } from "../users/userSession.js";
import { saveEquipped } from "../users/playerData.js";
import { SHOP_ITEMS, CATEGORIES } from "../shop/shopItems.js";
import { groupBySlot, buildLoadout, cleanEquipped, toggleItem, getCategory } from "./avatar/loadout.js";
import { renderStage, describeStage } from "./avatar/stage.js";

const page = document.getElementById("customize");
const inventoryPanel = document.getElementById("inventoryPanel");
const showcasePanel = document.getElementById("showcasePanel");
const status = document.getElementById("customizeStatus");

const drawer = document.getElementById("questDrawer");
const drawerTab = document.getElementById("questDrawerTab");
const drawerClose = document.getElementById("questDrawerClose");
const drawerBody = document.getElementById("questDrawerBody");
const sidebar = document.getElementById("questSidebar");
const home = document.getElementById("home");

// "avatar" = Wardrobe, "room" = Room
let showcase = "avatar";
// "all" or a slot id like "hat"
let slotFilter = "all";
let saving = false;

function ownedEquipped(user) {
    return cleanEquipped(SHOP_ITEMS, user.inventory, user.equipped ?? []);
}

// ---------- Inventory (left) ----------
function inventoryItem(item, equippedIds) {
    const isOn = equippedIds.includes(item.id);
    return `
        <button class="inv-item ${isOn ? "is-equipped" : ""}" type="button"
                data-equip-item="${item.id}" aria-pressed="${isOn}"
                aria-label="${item.name}, ${isOn ? "equipped. Click to unequip" : "click to equip"}">
            <span class="inv-preview" data-preview-category="${item.category}"
                  data-preview-item="${item.id}"></span>
            <span class="inv-name">${item.name}</span>
            <span class="inv-badge">${isOn ? "Equipped" : "Equip"}</span>
        </button>`;
}

function renderInventory(user) {
    const category = getCategory(showcase);
    const equippedIds = ownedEquipped(user);
    const owned = SHOP_ITEMS.filter((item) => user.inventory.includes(item.id));
    const groups = groupBySlot(owned, showcase)
        .filter((group) => slotFilter === "all" || group.slot.id === slotFilter);

    const chips = [{ id: "all", label: "All" }, ...category.slots].map((slot) => `
        <button class="chip ${slotFilter === slot.id ? "is-active" : ""}" type="button"
                data-slot-filter="${slot.id}" aria-pressed="${slotFilter === slot.id}">
            ${slot.label}
        </button>`).join("");

    const ownedInCategory = owned.filter((item) => item.category === showcase).length;

    let body;
    if (ownedInCategory === 0) {
        body = `
            <div class="inv-empty">
                <p>Your wagon is empty!</p>
            </div>`;
    } else {
        body = groups.map((group) => `
            <section class="inv-group">
                <h3>${group.slot.label}</h3>
                ${group.items.length
                    ? `<div class="inv-grid">${group.items.map((item) => inventoryItem(item, equippedIds)).join("")}</div>`
                    : `<p class="inv-none">Nothing here, bud.</p>`}
            </section>`).join("");
    }

    inventoryPanel.innerHTML = `
        <header class="panel-header">
            <h2>Inventory</h2>
        </header>
        <div class="chip-row" role="group" aria-label="Filter by slot">${chips}</div>
        <div class="inv-scroll">${body}</div>`;

    inventoryPanel.querySelectorAll("[data-preview-item]").forEach((preview) => {
        renderStage(preview, preview.dataset.previewCategory, [preview.dataset.previewItem]);
    });
}

// ---------- Showcase (right) ----------
function renderShowcase(user) {
    const category = getCategory(showcase);
    const equippedIds = ownedEquipped(user);
    const loadout = buildLoadout(SHOP_ITEMS, equippedIds, showcase);

    const tabs = CATEGORIES.map((option) => `
        <button class="segment ${option.id === showcase ? "is-active" : ""}" type="button" role="tab"
                aria-selected="${option.id === showcase}" data-showcase="${option.id}">
            ${option.label}
        </button>`).join("");

    const slots = category.slots.map((slot) => {
        const item = loadout[slot.id];
        return `
            <li class="slot-row">
                <span class="slot-label">${slot.label.replace(/s$/, "")}</span>
                <span class="slot-value ${item ? "" : "is-empty"}">${item ? item.name : "Empty"}</span>
                ${item
                    ? `<button class="slot-remove" type="button" data-equip-item="${item.id}"
                               aria-label="Unequip ${item.name}">Remove</button>`
                    : ""}
            </li>`;
    }).join("");

    showcasePanel.innerHTML = `
        <div class="segmented" role="tablist" aria-label="Showcase">${tabs}</div>
        <div class="showcase-stage-wrap">
            <div class="showcase-stage" id="showcaseStage"></div>
        </div>
        <ul class="slot-summary" aria-label="Equipped ${category.label.toLowerCase()} slots">${slots}</ul>`;

    renderStage(
        document.getElementById("showcaseStage"),
        showcase,
        equippedIds,
        describeStage(showcase, equippedIds)
    );
}

// The character on the Home tab shows the same equipped avatar items.
function renderHomeAvatar(user) {
    const homeAvatar = document.getElementById("homeAvatar");
    const equippedIds = user ? ownedEquipped(user) : [];
    renderStage(homeAvatar, "avatar", equippedIds, describeStage("avatar", equippedIds));
}

function renderCustomize() {
    const user = getCurrentUser();
    renderHomeAvatar(user);

    if (!user) {
        inventoryPanel.innerHTML = `<p>Sign in to customize your avatar and room.</p>`;
        showcasePanel.innerHTML = "";
        return;
    }
    renderInventory(user);
    renderShowcase(user);
}

function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
}

// ---------- Equip / unequip ----------
async function toggleEquip(itemId) {
    const user = getCurrentUser();
    if (!user || saving) return;

    const before = ownedEquipped(user);
    let after;
    try {
        after = toggleItem(SHOP_ITEMS, user.inventory, before, itemId);
    } catch (error) {
        setStatus(error.message, true);
        return;
    }

    const nowOn = after.includes(itemId);
    const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId);

    // Show the change immediately, then save it.
    saving = true;
    setCurrentEquipped(after);
    setStatus((nowOn ? "Equipped " : "Removed ") + item.name + ".");

    try {
        await saveEquipped(user.id, itemId, nowOn, after);
    } catch (error) {
        console.error(error);
        setStatus("Couldn't save that change: " + error.message, true);
        await refreshCurrentUser(); // go back to what the database has
    } finally {
        saving = false;
    }
}

page.addEventListener("click", (event) => {
    const showcaseButton = event.target.closest("[data-showcase]");
    if (showcaseButton) {
        showcase = showcaseButton.dataset.showcase;
        slotFilter = "all";
        renderCustomize();
        return;
    }

    const filterButton = event.target.closest("[data-slot-filter]");
    if (filterButton) {
        slotFilter = filterButton.dataset.slotFilter;
        renderCustomize();
        return;
    }

    const equipButton = event.target.closest("[data-equip-item]");
    if (equipButton) toggleEquip(equipButton.dataset.equipItem);
});

// The shop's "Owned · Equip" link opens the matching showcase.
document.addEventListener("questmanager:showcase", (event) => {
    if (event.detail?.category) showcase = event.detail.category;
    slotFilter = "all";
    renderCustomize();
});

// ---------- Quest drawer ----------
// Customize keeps the quest sidebar closed in a tab on the left edge.
// The same sidebar element is moved here (instead of copied) so all of the
// task code in script.js keeps working without changes.
function setDrawerOpen(open) {
    drawer.hidden = !open;
    drawerTab.setAttribute("aria-expanded", String(open));
    page.classList.toggle("drawer-open", open);
    if (open) drawerClose.focus();
}

function placeSidebar() {
    const onCustomize = location.hash === "#customize";
    if (onCustomize && sidebar.parentElement !== drawerBody) {
        drawerBody.appendChild(sidebar);
    } else if (!onCustomize && sidebar.parentElement !== home) {
        home.prepend(sidebar);
    }
    if (!onCustomize) setDrawerOpen(false);
}

drawerTab.addEventListener("click", () => setDrawerOpen(drawer.hidden));
drawerClose.addEventListener("click", () => {
    setDrawerOpen(false);
    drawerTab.focus();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !drawer.hidden) {
        setDrawerOpen(false);
        drawerTab.focus();
    }
});

window.addEventListener("hashchange", placeSidebar);
document.addEventListener("questmanager:userChanged", renderCustomize);

placeSidebar();
setDrawerOpen(false);
renderCustomize();