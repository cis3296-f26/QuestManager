// Observe the existing auth client, without importing the homepage UI or adding DB calls.
// Guest/unavailable-auth play is memory-only; it is never copied into an account.
export async function connectGameSession(onAccountChange,
    loadClient = () => import("../../main/users/supabaseClient.js")) {
    let supabase;
    try {
        ({ supabase } = await loadClient());
    } catch {
        onAccountChange(null);
        return { verifyAccount: async (id) => id === null };
    }

    let revision = 0;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        revision++;
        // Keep this callback synchronous: Supabase warns against awaiting auth calls here.
        onAccountChange(session?.user?.id ?? null);
    });
    const startRevision = revision;
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (revision === startRevision) onAccountChange(data.session?.user?.id ?? null);
    } catch {
        if (revision === startRevision) onAccountChange(null);
    }

    return {
        async verifyAccount(expectedId) {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) return false;
                const id = data.session?.user?.id ?? null;
                if (id !== expectedId) onAccountChange(id);
                return id === expectedId;
            } catch { return false; }
        },
        dispose() { subscription.subscription.unsubscribe(); }
    };
}
