const { spawn } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');

const generateTimelapseForCamera = (node, tmpDirectory, threadsPerCamera, camera, output_directory, output_width, output_height, output_framerate) => new Promise((resolve, reject) => {
  // Check to make sure output directory exists
  fs.mkdirSync(output_directory, { recursive: true });

  const tmpCamDirectory = path.join(tmpDirectory, camera);
  const inputFilesPath = path.join(tmpCamDirectory, '*.jpg');

  const outputPath = path.join(output_directory, `${camera}.mp4`);

  node.debug(`Creating video ${outputPath}`);

  const ffmpegVideoArgs = [
    '-hide_banner',                 // Reduce console output
    '-y',                           // Overwrite output file if exists
    '-err_detect', 'aggressive',
    '-fflags', 'discardcorrupt',
    '-framerate', output_framerate, // Input framerate
    '-pattern_type', 'glob',        // Use glob input
    '-i', inputFilesPath,           // Input files glob
    '-an',                          // Audio none
    '-vf', `scale=${output_width}:${output_height}`, // Scale output
    '-c:v', 'libx264',              // Use x264 encoder
    '-preset', 'slow',              // x264 encoder preset
    outputPath,                     // Output file
  ];

  const ffmpegVideo = spawn(ffmpegPath, ffmpegVideoArgs);

  ffmpegVideo.on('error', (err) => {
    node.warn(err);
  });

  ffmpegVideo.stdout.on('data', (data) => {
    node.debug(`${data}`);
  });

  ffmpegVideo.stderr.on('data', (data) => {
    node.debug(`${data}`);
  });

  ffmpegVideo.on('exit', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`ffmpeg exited with code ${code}`));
    }
  });
});

module.exports = generateTimelapseForCamera;
