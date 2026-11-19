# QuestManager

QuestManager turns everyday tasks into quests. Complete tasks to earn currency, shop for character and room items, customize your look, and take your character into a ten-level platforming adventure.

Built for **CIS 3296 at Temple University** with HTML, CSS, JavaScript, Canvas and Supabase.

## Features

### Quests and planning

- Create, edit, delete and complete quests with a title, description, difficulty, due date, optional time, priority and task type.
- Organize today's quests on the Home priority board.
- View and manage the same quests in the Journal calendar, including dragging quests to reschedule them.
- Review missed quests and move them to today.
- Earn currency by completing quests. Account features require signing in.

### Shop and customization

- Buy character equipment, hats, armor, wallpapers and flooring with earned currency.
- Equip owned items and customize the character's skin, hair and eyes.
- Preview your character and room in Customize.
- Use your customized character in Adventure.

### Adventure

- Ten side-scrolling levels connected through a world map and level-selection dialogs.
- Shared movement, character animations, camera scrolling, enemy patrols and death/restart behavior.
- Stompable and non-stompable enemies, gaps, spikes, moving and collapsing platforms, switches, gates and secret routes.
- Later environments add wind, ice, climbing, timed energy hazards, lava and geysers.
- Exactly three special gold coins per level, for **30 achievement coins** across the adventure.
- A final three-seal environmental guardian encounter with the Ember Warden, followed by an adventure-ending screen and credits.
- Pause menu, settings, music and sound-effect controls, and Reduce Motion.

All ten levels are implemented. Visual refinement, difficulty balancing and player playtesting remain ongoing.

## Run locally

### Requirements

- A modern browser such as Chrome, Edge or Firefox.
- Python 3 for the included local server, or another static HTTP server such as VS Code Live Server.
- An internet connection for Supabase and browser libraries loaded from CDNs.
- Git to clone the repository.
- Node.js 20 or newer and npm if you want to install dependencies or run automated tests.

### Quick start

```bash
git clone --branch master https://github.com/cis3296-f26/QuestManager.git
cd QuestManager
python game/scripts/serve-development.py
```

Open **http://127.0.0.1:8000/** for QuestManager. The server also prints the direct Adventure address, **http://127.0.0.1:8000/game/**.

If your system uses `python3`, substitute it for `python`. To choose another port:

```bash
python game/scripts/serve-development.py --port 8080
```

There is no frontend compilation step or `npm start` command. Serve the repository root over HTTP; opening `index.html` directly with a `file://` URL is not supported by the module-based app. Installing npm dependencies is not required simply to serve the frontend, which loads its browser libraries from CDNs.

**VS Code alternative:** open the repository folder and use Live Server on the root `index.html`. Use the included Python server when you need developer tools.

### Sign in and explore

1. Open the root app, then sign up or sign in.
2. Complete onboarding to choose your character's appearance.
3. Add quests from Home or Journal and complete them to earn currency.
4. Visit Shop to buy items, then Customize to equip them or decorate your room.
5. Select **Adventure** to open the world map. Completing a level unlocks the next one; levels do not advance automatically.

## Supabase connection

The frontend uses the existing Supabase project configured in [`main/users/supabaseClient.js`](main/users/supabaseClient.js). Authentication, task data, balances and inventory depend on that backend being available.

Running the local server does **not** create a database. If you connect a fork to a different Supabase project, you must configure its authentication redirects, tables, access policies and RPC functions to match the existing calls in [`main/users/playerData.js`](main/users/playerData.js). The repository does not automatically provision a fresh Supabase backend.

Keep privileged database credentials and service-role keys out of frontend code.

## Adventure levels

| Level | Name | Environment |
| --- | --- | --- |
| 1 | The First Adventure | Grasslands |
| 2 | The Winding Grove | Forest |
| 3 | Deep Forest | Dense woodland |
| 4 | Crystal Cave | Crystal chambers |
| 5 | Sunscorched Dunes | Desert canyons and oasis |
| 6 | The Lost Sun Temple | Ancient desert ruins |
| 7 | Frozen Peaks | Ice and snow |
| 8 | Mountain Cliffs — The Skyward Ascent | Mountain towers and climbing routes |
| 9 | Volcano — The Inferno's Edge | Lava fields and volcanic chambers |
| 10 | Volcano Castle — The Ember Crown | Fortress machinery and the Ember Warden |

### Controls

Click inside the game to give it keyboard focus.

| Action | Controls |
| --- | --- |
| Move | A/D or left/right arrows |
| Jump | Space, W or up arrow |
| Attach to or release a nearby rope/ladder | E |
| Climb while attached | W/S or up/down arrows |
| Jump off a rope/ladder | Space |
| Restart the level | R |
| Pause or resume | Esc or the Pause button |

Land on stompable enemies from above while descending to defeat them and bounce. Side contact, upward contact and non-stompable enemies remain dangerous. Use Settings for the in-game controls reference and audio/accessibility options.

## Currency and saved progress

**Shop currency and adventure coins are separate systems.** Buying an item never spends special collectible coins.

- **Quests, balances and purchases:** use the existing Supabase backend.
- **Character appearance:** stored in the signed-in user's existing account metadata. Equipped items use the existing inventory/loadout system, with a local fallback where supported.
- **Adventure achievements:** stored locally in the browser, scoped to the signed-in account. They are not currently synchronized to Supabase or other browsers/devices.
- **Guest play or unavailable browser storage:** adventure progress is session-only.

New adventure coins save only when you successfully reach the finish flag. Dying, restarting or leaving discards newly collected coins from that attempt. Previously saved coins remain credited and appear faded on replay. You can earn the three coins over multiple successful runs without duplicate rewards.

Completing a level unlocks the next even without all three coins. Level 10 additionally requires defeating the Ember Warden before the final flag can complete the adventure. Its ending shows saved totals; the perfect-adventure message requires all 30 legitimately earned coins.

Later-level refuge checkpoints are temporary for the current attempt. They help with death recovery, but do not bank coins or survive a manual restart/replay.

## Development and testing

Install the declared dependencies and run the automated suite from the repository root:

```bash
npm ci
npm test
npm run validate:levels
```

If parallel test workers overload your machine, run the same full suite with fewer workers:

```bash
npm test -- --test-concurrency=4
```

The tests cover shared gameplay, account isolation, customization integration, progress saving and UI behavior. The level validator checks authored geometry and recorded ordinary-input routes, including all-coin, zero-coin and optional-area routes at 30, 60 and 120 FPS.

Automated routes establish that tested paths are possible; they do not replace browser playtesting or prove that a level feels polished. See [`game/docs/`](game/docs/README.md) for design reviews, screenshots/native previews, testing limitations and manual playtest instructions.

### Developer tools

Developer tools are disabled in normal static hosting. Opt in locally with:

```bash
python game/scripts/serve-development.py --dev-tools
```

Open Adventure, then **Pause → Settings → Developer Mode**. Testing tools include flight, invincibility, hitboxes, game-speed controls, level loading, safe teleport destinations and coin-reset actions. Assisted runs are marked **TEST RUN — PROGRESS NOT SAVED** and cannot award permanent adventure progress.

The original soundtrack can also be previewed locally at **http://127.0.0.1:8000/game/dev/music-preview.html** while this server option is enabled.

## Project structure

| Path | Responsibility |
| --- | --- |
| `index.html` | Main QuestManager page and navigation |
| `main/script.js` | Quest planning, priority board and calendar integration |
| `main/quests/` | Quest models and related behavior |
| `main/users/` | Authentication, sessions and existing Supabase data access |
| `main/onboarding/` | Initial character setup |
| `main/shop/` | Item catalog, purchases and shop interface |
| `main/customize/` | Character/room customization and shared appearance layers |
| `style/` | Main application styles |
| `assets/` | Character sheets, equipment, room and other visual assets |
| `game/game.js` | Adventure entry point and shared gameplay/UI wiring |
| `game/engine/`, `game/entities/` | Reusable movement, collision, hazards, players, enemies and platforms |
| `game/levels/` | Level configurations, mechanisms, collectibles and route validation |
| `game/rendering/` | Character, environment and gameplay rendering |
| `game/progress/` | Account-scoped local adventure achievements and session handling |
| `game/audio/`, `game/settings/`, `game/ui/` | Music, sound, preferences, menus and map |
| `game/dev/`, `game/scripts/` | Local developer tools, preview utilities and server |
| `game/tests/` | Automated gameplay/integration tests and recorded route fixtures |
| `game/docs/` | Game documentation and playtest guides |

## Contributing

Use feature branches and pull requests, and keep unrelated changes separate. `master` is the integration branch for the current app; `game-prototype` is used for ongoing Adventure development.

Review applicable `AGENTS.md` instructions before changing game code. Preserve existing account boundaries, achievement coin IDs and completion-only saving. Run the relevant tests before opening a PR, and include manual testing notes for visual or gameplay changes. Supabase changes require coordination with the team.
