use std::env;
use serde::Deserialize;

use crate::file_loader::load_from_file;

#[derive(Debug, Deserialize)]
pub struct Config {
    pub fullscreen: Option<bool>,
    pub max_fps: Option<u32>,
    pub uniforms: Uniforms,
    pub audio: AudioConfig,
    pub debug: DebugConfig,
}

#[derive(Debug, Deserialize)]
pub struct AudioConfig {
    pub buffer_size: u32,
    pub num_buffers: usize,
    pub fft_size: u32,
    pub cutoff: f32,
    pub q: f32,
    pub gain: f32,
}

#[derive(Debug, Deserialize)]
pub struct Uniforms {
    pub decay: f32,
    pub thickness: f32,
    pub min_thickness: f32,
    pub thinning: f32,
    pub base_hue: f32,
    pub colorize: bool,
    pub desaturation: f32,
}

#[derive(Debug, Deserialize)]
pub struct DebugConfig {
    pub print_drop: bool,
}

pub fn load_config() -> Config {
    let config_filename = env::args().nth(1)
        .unwrap_or_else(|| panic!("put in a config file"));
    let config_file = load_from_file(&config_filename);
    toml::from_str(&config_file)
        .unwrap_or_else(|e| panic!("invalid config file: {}", e))
}
