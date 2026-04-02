# Audioscope (Rust)

Native desktop implementation using PortAudio and OpenGL (via glium).

## Quick Start

From this `rust/` directory:

```bash
cargo run --release -- config.toml
```

If you want to reduce warning noise while debugging:

```bash
RUSTFLAGS="-Awarnings" cargo run --release -- config.toml
```

## Dependencies

This implementation requires native PortAudio headers/libraries.

macOS (Homebrew):

```bash
brew install portaudio
brew install pkg-config
```

Other systems:

- See the rust-portaudio installation notes:
  https://github.com/RustAudio/rust-portaudio#installation

## Build Commands

```bash
cargo build
cargo build --release
cargo test
```

## Project Structure

```text
src/
  main.rs
  config.rs
  audio.rs
  display.rs
  file_loader.rs
  glsl/
    clear.vert
    clear.frag
    line.vert
    line.geom
    line.frag
config.toml
Cargo.toml
```

- `main.rs`: wires config loading, audio stream startup, and display loop.
- `config.rs`: parses TOML config from the first CLI argument.
- `audio.rs`: PortAudio input, FFT processing, and analytic signal preparation.
- `display.rs`: window setup, shader loading, and rendering.
- `file_loader.rs`: utility for loading config/shader files.

## Configuration

Runtime config is read from the first argument. Example:

```bash
cargo run --release -- config.toml
```

Useful fields in `config.toml`:

- `max_fps`, `fullscreen`
- `[audio]` for buffer and FFT settings
- `[uniforms]` for rendering parameters
- `[debug]` for dropped-buffer logging

## Troubleshooting

- Shaders not found:
  Run from `rust/` so relative shader paths like `src/glsl/line.vert` resolve.
- Audio source on macOS:
  To visualize system audio instead of microphone input, route audio with a loopback tool such as Soundflower or BlackHole.

## Related Docs

- Repository overview: [../README.md](../README.md)
- Browser implementation: [../browser/README.md](../browser/README.md)
