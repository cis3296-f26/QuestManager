// The avatar's body: skin, hair, eyes. This is chosen once during onboarding
// (and can be changed later from the Customize tab). Shop items (hat, armor,
// equipment) are drawn on top of it by stage.js.
//
// Saved in the Supabase auth user's metadata, so no new table is needed:
//   { skin: 1, hairStyle: 2, hairColor: "brown", eyes: 3 }

const PARTS = "assets/character/parts/";

// Listed light -> dark.
export const SKINS = [
    { id: 1, label: "Light", color: "#faf3e8" },
    { id: 3, label: "Medium", color: "#664524" },
    { id: 2, label: "Dark", color: "#382819" }
];

export const HAIR_STYLES = [1, 2, 3, 4, 5].map((id) => ({ id, label: "Style " + id }));

export const HAIR_COLORS = [
    { id: "brown", label: "Brown", color: "#6b4226" },
    { id: "black", label: "Black", color: "#1e1a18" },
    { id: "blond", label: "Blond", color: "#e8c66a" }
];

export const EYES = [
    { id: 1, label: "Black", color: "#181413" },
    { id: 2, label: "Dark brown", color: "#291a14" },
    { id: 4, label: "Amber", color: "#9d5728" },
    { id: 5, label: "Green", color: "#4b692f" },
    { id: 3, label: "Blue", color: "#5fcde4" },
    { id: 6, label: "Purple", color: "#76428a" }
];

const FRAMES = 4;

export const DEFAULT_APPEARANCE = Object.freeze({ skin: 1, hairStyle: 1, hairColor: "brown", eyes: 1 });

// Returns a valid appearance, or null when the value isn't one
// (e.g. a brand new account that hasn't done onboarding yet).
export function normalizeAppearance(value) {
    if (!value || typeof value !== "object") return null;
    const skin = SKINS.find((o) => o.id === Number(value.skin));
    const hairStyle = HAIR_STYLES.find((o) => o.id === Number(value.hairStyle));
    const hairColor = HAIR_COLORS.find((o) => o.id === value.hairColor);
    const eyes = EYES.find((o) => o.id === Number(value.eyes));
    if (!skin || !hairStyle || !hairColor || !eyes) return null;
    return { skin: skin.id, hairStyle: hairStyle.id, hairColor: hairColor.id, eyes: eyes.id };
}

// Sprite layers, back to front: skin, outfit, eyes, hair.
export function appearanceLayers(appearance) {
    const a = normalizeAppearance(appearance) ?? DEFAULT_APPEARANCE;
    const layer = (file, alt) => ({ src: `${PARTS}${file}.png`, count: FRAMES, alt, base: true });
    return [
        layer(`skin${a.skin}`, ""),
        layer("outfit", ""),
        layer(`eyes${a.eyes}`, ""),
        layer(`hair${a.hairStyle}-${a.hairColor}`, "")
    ];
}

export function randomAppearance(random = Math.random) {
    const pick = (list) => list[Math.floor(random() * list.length)].id;
    return {
        skin: pick(SKINS),
        hairStyle: pick(HAIR_STYLES),
        hairColor: pick(HAIR_COLORS),
        eyes: pick(EYES)
    };
}
