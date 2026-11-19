// Read only banked account progress, never CoinManager.pending or a debug total.
export function adventureSummary(progress, { eligible = false, assisted = false } = {}) {
    const completed = Array.from({ length: 10 }, (_, i) => progress.getLevel(i + 1)).filter(p => p.completed).length;
    const coins = progress.totalCoins.earned;
    const legitimate = eligible && !assisted;
    return { completed, coins, perfect: legitimate && completed === 10 && coins === 30,
        title: assisted ? "TEST RUN — PROGRESS NOT SAVED" : legitimate && completed === 10 ? "QUEST COMPLETE!" : "Final Flag Reached",
        message: assisted ? "The guardian fell in a test run. No achievements were saved." : legitimate && completed === 10 ?
            "You completed all 10 levels of QuestManager!" : "Your final run could not confirm a complete ten-level adventure.",
        congratulations: legitimate ? "From your first meadow jump to the Ember Crown—your adventure is yours to revisit. Thank you for playing!" : "Return for a verified, unassisted run to save new progress." };
}
export function renderAdventureEnding(document, progress, options) {
    const s = adventureSummary(progress, options);
    document.getElementById("levelCompleteTitle").textContent = s.title;
    document.getElementById("levelCompleteDescription").textContent = s.message;
    document.getElementById("adventureTotals").textContent = `Saved Levels: ${s.completed}/10 · Special Gold Coins: ${s.coins}/30`;
    document.getElementById("adventureMessage").textContent = s.congratulations;
    document.getElementById("perfectAdventure").hidden = !s.perfect;
    document.getElementById("adventureEnding").hidden = false;
    document.getElementById("creditsPanel").hidden = true;
    document.getElementById("viewCredits").hidden = false;
    document.getElementById("nextLevel").hidden = true;
    return s;
}
