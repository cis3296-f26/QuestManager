// Results display is shared by all levels, including the final adventure ending.
export function formatRunTime(ms) {
    if (!Number.isSafeInteger(ms) || ms < 0) return "—";
    const hundredths = Math.floor(ms / 10);
    const minutes = Math.floor(hundredths / 6000);
    const seconds = Math.floor(hundredths / 100) % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths % 100).padStart(2, "0")}`;
}

export function renderRunResults(document, run, { coinCount, bestTimeMs,
    eligible, newPersonalBest = false, persistent = false } = {}) {
    document.getElementById("resultTime").textContent = formatRunTime(run.timeMs);
    document.getElementById("resultDeaths").textContent = String(run.deaths);
    document.getElementById("resultRunCoins").textContent = `${coinCount}/3`;
    document.getElementById("resultBestLabel").textContent = persistent ? "Personal best" : "Session best";
    document.getElementById("resultBestTime").textContent = formatRunTime(bestTimeMs);
    const notice = document.getElementById("resultRecordNotice");
    notice.textContent = !eligible ? "This run did not save a new time record." :
        newPersonalBest ? persistent ? "New personal best!" : "New session best!" : "";
    notice.hidden = !notice.textContent;
}
