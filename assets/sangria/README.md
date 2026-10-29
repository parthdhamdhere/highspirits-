# Sangria scroll scene

The existing Blender 4.5 / Cycles scene now renders native 1920×1080 frames at 24 fps with up to 96 adaptive samples, GPU denoising, refractive crystal and a closed ruby-liquid volume. This is original procedural 3D footage, not filmed liquid or a baked fluid simulation.

Run Blender with `--background --python assets/sangria/build_scene.py -- 0` to render all 240 frames. A positive integer renders one frame; `1:24` renders a range. Output is `assets/sangria/renders-hd/` (ignored by Git). The saved blend holds the final scene; the deterministic `pose` function drives animation.

The camera keeps the complete glass silhouette visible, gently arcs to leave space for the existing hero copy, and finishes at the same framing as the poster. The stream follows the carafe lip; ice starts inside the bowl; orange and rosemary travel into frame before settling. Frame 195 through 240 is a true still hold, copied from the same render to avoid denoising shimmer.

Run `sh assets/sangria/encode.sh` after the full render. It writes the 1080p H.264 film, opening JPEG, and finished poster into `frontend/public/sangria/`. Frequent keyframes support reverse scroll seeking; the film is silent and fast-start enabled. No browser rendering dependency is required.

The existing React component completes the ten-second film over the first 72% of its native sticky scroll range, then holds the poster and readable booking links for the remaining 28% (a little over one viewport). Further scrolling releases the hero normally. Skip moves to the start of the hold; reduced motion, a media error, and no JavaScript show the finished composition directly. Mobile uses a separate text row and follows the glass within the wide frame.

Visual verification must cover opening, pour, garnish and final frames plus desktop, tablet and phone crops. Resolution alone does not establish photorealism; the fluid movement remains procedurally choreographed.

## Browser regression check

With the API running and a production frontend at port 3001, run `node assets/sangria/check_browser.mjs` from the repository root (override with `CHECK_URL`). This uses the existing Taste browser helper and installed Chrome; it adds no runtime dependency. It asserts native video dimensions, pinned hero bounds, reverse seeking, skip focus, section release and reduced-motion/no-script/error fallbacks at six screen sizes. Screenshots and results are saved under `.taste-skill/sangria-check/`. The page's unrelated event-card overflow at 320px is recorded separately from the hero's overflow check.

Run `Blender --background --python assets/sangria/check_scene.py` to assert the full glass remains in frame at every pose, the final glass clears the text column, ice stays inside the bowl, and the pour remains connected to the carafe lip. This geometry check does not certify photographic realism.
