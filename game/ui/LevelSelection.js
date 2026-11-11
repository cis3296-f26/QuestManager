import { renderCoinProgress } from "./CoinProgress.js";

// Ready for a future map dialog. Nothing mounts this component during the Level 1 playtest.
export function renderLevelSelection(container, config, progress, onPlay) {
    const heading = document.createElement("h2");
    heading.textContent = `Level ${config.id}: ${config.name}`;
    const status = document.createElement("p");
    status.textContent = progress.fullyCompleted ? "Fully completed · 3/3 coins" :
        progress.completed ? "Completed" : progress.unlocked ? "Ready to explore" : "Locked";
    const coins = document.createElement("div");
    renderCoinProgress(coins, config.coins, progress.coinIds);
    const play = document.createElement("button");
    play.type = "button";
    play.className = "adventure-button";
    play.textContent = progress.completed ? "Replay Level" : "Play Level";
    play.disabled = !progress.unlocked;
    play.addEventListener("click", () => onPlay(config.id));
    container.replaceChildren(heading, status, coins, play);
}
