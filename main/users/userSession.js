import { User } from "./users.js";
import { loadPlayer } from "./playerData.js";
import { normalizeAppearance } from "../customize/avatar/appearance.js";

// null means no account is currently signed in.
let currentUser = null;
let currentAccount = null;

let loadCounter = 0;

export function getCurrentUser() {
    return currentUser;
}

// Let the interface refresh when the authentication state changes.
function notify() {
    document.dispatchEvent(new CustomEvent("questmanager:userChanged"));
    }

//THIS METHOD LOADS **FROM** THE DATABASE. Should be called after every good BUY or COMPLETE TASK.
export async function refreshCurrentUser() {
    const account = currentAccount;
    if (!account) return null;

    const thisLoad = ++loadCounter;

    try {
        const saved = await loadPlayer(account.id);
        if (thisLoad !== loadCounter) return null; // a newer load started

        currentUser = new User(
            account.id,
            saved.username || account.user_metadata?.player_name || account.email,
            saved.balance,
            saved.inventory,
            saved.equipped,
            normalizeAppearance(account.user_metadata?.appearance)
        );
        // New players have to finish the tutorial once; saved on the account.
        currentUser.tutorialDone = Boolean(account.user_metadata?.tutorial_done);
    } catch (error) {
        if (thisLoad !== loadCounter) return null;
        console.error("Could not load player:", error);
        currentUser = null;
    }

    notify();
    return currentUser;
}

export function setCurrentEquipped(equippedIds) {
    if (!currentUser) return;
    currentUser.equipped = [...equippedIds];
    notify();  // fires "questmanager:userChanged"
}


// Called when the player finishes the tutorial, so it doesn't start again.
export function markTutorialDone() {
    if (!currentUser) return;
    currentUser.tutorialDone = true;
    if (currentAccount) {
        currentAccount.user_metadata = { ...currentAccount.user_metadata, tutorial_done: true };
    }
}

// Called after the new look has been saved to the account.
export function setCurrentAppearance(appearance) {
    if (!currentUser) return;
    currentUser.appearance = { ...appearance };
    // Keep the cached account in step so a later reload doesn't bring the old look back.
    if (currentAccount) {
        currentAccount.user_metadata = { ...currentAccount.user_metadata, appearance: { ...appearance } };
    }
    notify();
}

export async function setUserFromSession(session) {
    const account = session?.user;
    const previousId = currentAccount?.id;
    currentAccount = account;

    if (!account) {
        ++ loadCounter; //cancels load
        currentUser = null;
        notify();
        return;
    }

    if (previousId === account.id && currentUser) return;
    
    // Don't show the previous account's coins while the new one loads.
    currentUser = null;
    notify();

    await refreshCurrentUser();
}