const { spawn } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');

const extractFramesFromRecording = (node, tmpCamDirectory, fileInfo) => new Promise((resolve, reject) => {
  const inputPath = `${fileInfo.fileName}`;
  const outputPath = `${path.join(tmpCamDirectory, `${fileInfo.timestamp}.jpg`)}`;

  const ffmpegArgs = [
    '-hide_banner',               // Reduce console output
    '-y',                         // Overwrite output file if exists
    '-err_detect', 'aggressive',
    '-fflags', 'discardcorrupt',
    '-i', inputPath,              // Input files glob
    '-an',                        // Audio none
    '-vframes', '1',              // One frame per file
    '-q:v', '2',                  // JPG quality 2-31. Lower is better.
    outputPath,                   // Output files
  ];

  const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

  ffmpeg.on('error', (err) => {
    node.warn(err);
  });

  ffmpeg.on('exit', (code) => {
    if (code === 0) {
      // eslint-disable-next-line no-param-reassign
      fileInfo.done = true;
      resolve();
    } else {
      try {
        // Delete any potentially corrupt output
        fs.unlinkSync(outputPath, { force: true });
      } catch (err) {
        node.debug(err);
      }
      reject(new Error(`ffmpeg exited with code ${code}`));
    }
  });

  ffmpeg.stdout.on('data', (data) => {
    node.debug(`${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    node.debug(`${data}`);
  });
});

module.exports = extractFramesFromRecording;
