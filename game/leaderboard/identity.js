import { safeUsername } from "./records.js";

// Existing private profile access, only for the current account. No new backend writes.
export async function loadLeaderboardIdentity(expectedId) {
    if (!expectedId) return { name: "Guest adventurer" };
    const [{ supabase }, { loadPlayer }, { AvatarRenderer }, { Player }] = await Promise.all([
        import("../../main/users/supabaseClient.js"), import("../../main/users/playerData.js"),
        import("../rendering/AvatarRenderer.js"), import("../entities/Player.js")
    ]);
    const current = async () => {
        const { data, error } = await supabase.auth.getSession();
        return !error && data.session?.user?.id === expectedId;
    };
    if (!await current()) throw new Error("Account changed");
    const profile = await loadPlayer(expectedId);
    const avatar = new AvatarRenderer();
    await avatar.load();
    if (!await current()) throw new Error("Account changed");
    return { name: safeUsername(profile.username, expectedId), draw(canvas) {
        const context = canvas.getContext("2d");
        if (!context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        const player = new Player({ x: canvas.width / 2 - 16, feetY: canvas.height - 8 });
        avatar.draw(context, player, { reduceMotion: true });
    } };
}
