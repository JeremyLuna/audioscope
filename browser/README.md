# Audioscope JS

A collection of audio visualizers true to the sound, for the browser.

## Run

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm start
```

Build production bundle:

```bash
npm run build
```

## Data Flow

- Audio is captured in an AudioWorklet and emitted as sample blocks.
- Each worklet message includes a monotonic `sampleIndex`.
- Main thread appends incoming blocks into rolling `N`-sample windows for time and quadrature channels.
- Renderer draws only when fresh sample indices arrive.
- Rendering does not stitch line segments across frame boundaries, which avoids artificial jump lines between frames.

## Known Limits

- Audio callbacks run faster than render frames, so visualization is a sampled view of the latest signal window.
- Display is constrained to `N` points per frame.
- Webpack may report bundle-size warnings in production builds; these do not block functionality.

## Potential Follow-Ups

- Add min/max bucket resampling for better transient preservation at lower draw rates.
- Add optional debug stats for sample index deltas and render cadence.
