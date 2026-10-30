import { User } from "./users.js";

// null means no account is currently signed in.
let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export function setUserFromSession(session) {
    const account = session?.user;

    if (!account) {
        currentUser = null;
    } else if (currentUser?.id !== account.id) {
        // Only create a new User when the account changes.
        // Repeated auth events must not reset earned coins or inventory.
        currentUser = new User(
            account.id,
            account.user_metadata?.player_name || account.email
        );
    }

    // Let the interface refresh when the authentication state changes.
    document.dispatchEvent(new CustomEvent("questmanager:userChanged"));
}