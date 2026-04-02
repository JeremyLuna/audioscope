# Audioscope

A collection of audio visualizers true to the sound.

## Which Implementation?

- **Rust app (`rust/`)**: native desktop app with PortAudio + OpenGL rendering.
- **Browser app (`browser/`)**: Web Audio + WebGL implementation running in the browser.

## Quick Start

- Rust: see [rust/README.md](rust/README.md)
- Browser: see [browser/README.md](browser/README.md)

## Implemented Views

- Analytic (Hilbert Scope)

## Shared Concepts

- Both implementations visualize an analytic signal built from incoming audio.
- Rendered frames are snapshots of the latest available sample window.
- Implementation-specific setup and troubleshooting live with each implementation.

## Additional Documentation

- [A high level explanation of the visualizer](https://medium.com/@conundrumer/a-perceptually-meaningful-audio-visualizer-ee72051781bc#.p87d5rrxg)

## Repository Layout

- `rust/`: native implementation, shaders, config, and Cargo project.
- `browser/`: browser implementation, webpack setup, and web source files.
