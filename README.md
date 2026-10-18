# QuestManager

## Project Description

QuestManager is a web application that turns a to-do list into a game. Users complete tasks to earn points and use those points to customize a character. The project is being developed for CIS 3296 at Temple University.

The current proof of concept includes adding tasks, marking tasks complete, displaying task points, and unlocking a sword for the character. Planned features include task organization, calendar views, a shop, and additional character and room customization. These planned features are not yet included in the current prototype.

## Installation Instructions

### Requirements

- A web browser such as Chrome, Edge, or Firefox.
- An internet connection to load Bootstrap 5.3.8 from its CDN.
- Git only if using the clone option below.

### Download the project

1. On the repository page, select **Code > Download ZIP**.
2. Extract the ZIP into a folder on your computer.
3. Keep the HTML, CSS, and image files together in that folder.

Alternatively, clone the repository:

```bash
git clone https://github.com/cis3296-f26/QuestManager.git
cd QuestManager
```

No package installation, database setup, or backend server is required for the current prototype.

## Build Instructions

The current prototype uses HTML, CSS, and JavaScript directly in the browser. There is no compilation or build command. After downloading or cloning, the files are ready to open.

## Run Instructions

1. Open the extracted or cloned project folder in your computer's file manager.
2. Open `proofOfConcept.html` with your web browser. If double-clicking opens an editor, right-click the file and choose **Open with**, then select your browser.
3. Enter a task in the **Add new...** field and click **+** or press **Enter**.
4. Check the box next to a task to mark it complete and display task points.
5. With at least one point available, click **Unlock Sword!** to change the character image.

An IDE, VS Code extension, or integrated browser is not required to run or demonstrate this version.

## Current Limitations

- Tasks, points, and the selected character image are not saved after refreshing or closing the page.
- The point total is recalculated from checked tasks whenever a checkbox changes, so previously spent points are not tracked correctly.
- The sword button currently allows repeated purchases.
- Calendar views, shop navigation, room customization, and other planned features are still under development.

## Project Files

| File | Purpose |
| --- | --- |
| `proofOfConcept.html` | Page structure and JavaScript for tasks, points, and the sword button |
| `proofOfConcept.css` | Custom page styling |
| `my_character.jpg` | Default character image |
| `with_sword.jpg` | Character image shown after unlocking the sword |
| `with_shield.jpg` | Image asset reserved for future use |

## Team Contributions

Each team member contributes through a separate branch and pull request. Changes should be reviewed and merged into `main` before they are included in a group release.
