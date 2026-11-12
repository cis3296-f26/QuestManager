import { developmentBuild } from "./buildConfig.js";

// Do not even import the player/score modules in normal builds.
if (developmentBuild) {
    const { mountMusicPreview } = await import("./MusicPreview.js");
    mountMusicPreview(document, window);
}
