import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { SKINS, HAIR_STYLES, HAIR_COLORS, EYES, normalizeAppearance, appearanceLayers, randomAppearance } from "./appearance.js";

test("every skin/hair/eyes combination points at a real sprite file", () => {
    for (const skin of SKINS) for (const hs of HAIR_STYLES) for (const hc of HAIR_COLORS) for (const eyes of EYES) {
        const layers = appearanceLayers({ skin: skin.id, hairStyle: hs.id, hairColor: hc.id, eyes: eyes.id });
        assert.equal(layers.length, 4);
        for (const layer of layers) assert.ok(existsSync(new URL("../../../" + layer.src, import.meta.url)), layer.src);
    }
});

test("normalizeAppearance rejects bad data and randomAppearance is always valid", () => {
    assert.equal(normalizeAppearance(null), null);
    assert.equal(normalizeAppearance({ skin: 9, hairStyle: 1, hairColor: "brown", eyes: 1 }), null);
    assert.equal(normalizeAppearance({ skin: 1, hairStyle: 1, hairColor: "pink", eyes: 1 }), null);
    for (let i = 0; i < 50; i++) assert.ok(normalizeAppearance(randomAppearance()));
});
