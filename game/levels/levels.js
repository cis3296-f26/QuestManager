import { level1 } from "./Level1.js";
import { level2 } from "./Level2.js";
import { level3 } from "./Level3.js";
import { level4 } from "./Level4.js";
import { level5 } from "./Level5.js";

// Registered levels share the engine and unlock from the preceding level's completion.
export const levels = [level1, level2, level3, level4, level5];



