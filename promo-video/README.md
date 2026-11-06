# AudioBounty promo video

The 33-second promo shown on the landing page, made with [Remotion](https://www.remotion.dev): 1920×1080 at 60 FPS, six scenes joined by custom 3D transitions.

```
npm install
npm run dev                                         # Remotion Studio: preview and edit
npx remotion render Promo out/audiobounty-promo.mp4  # render the full video
```

- `src/scenes/` one file per scene: Hook, StreamMoment, Dashboard, Features, Setup, Finale. Each is also its own composition in Studio.
- `src/lib/World.tsx` the 3D camera. A scene describes the camera per frame and the world adds directional motion blur when it moves fast.
- `src/lib/Kinetic.tsx` kinetic type, `src/lib/transitions.tsx` the zoom, whip and door transitions, `src/lib/theme.tsx` the site's colors and UI pieces.

Sound effects load from remotion.media, so rendering needs an internet connection.

The landing page uses a smaller copy: `public/promo.mp4` (1280 wide, no audio) and `public/promo.jpg` as its poster.

Remotion is free for individuals and teams of up to 3; see its license for larger companies.
