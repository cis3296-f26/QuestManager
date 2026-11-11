import { User } from "./users.js";
import { loadPlayer } from "./playerData.js";

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
            saved.inventory
        );
    } catch (error) {
        if (thisLoad !== loadCounter) return null;
        console.error("Could not load player:", error);
        currentUser = null;
    }

    notify();
    return currentUser;
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