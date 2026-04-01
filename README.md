# Audioscope

A collection of audio visualizers true to the sound.

## Implemented Views

- Analytic (Hilbert Scope)

## How to Run

### 1. Install Dependencies

This project requires `portaudio` to be installed on your system.

**macOS (using Homebrew):**
```bash
brew install portaudio
brew install pkg-config
```

**Other Systems:**
Please refer to the [rust-portaudio installation guide](https://github.com/RustAudio/rust-portaudio#installation) for instructions for your operating system.

### 2. Build and Run

Once the dependencies are installed, you can build and run the application using Cargo:

```bash
cargo run --release -- config.toml
```

I also run like this to avoid all the warnings and focus on the errors:
```bash
RUSTFLAGS="-Awarnings" cargo run --release -- config.toml
```

This will start the audio visualizer using your default audio input device. On macOS, this is typically the built-in microphone.

### Troubleshooting

- **Shaders not found:** The application needs to be run from the root of the project directory so it can find the `src/glsl` directory, where the shaders are located.
- **Audio input:** If you want to visualize audio from a source other than your microphone, you may need to use a tool like [Soundflower](httpsd://github.com/mattingalls/Soundflower) on macOS to route audio between applications.

## Additional Documentation

- [A high level explanation of the visualizer](https://medium.com/@conundrumer/a-perceptually-meaningful-audio-visualizer-ee72051781bc#.p87d5rrxg)
- [Project Trello Board](https://trello.com/b/je2p03G7/audioscope)
