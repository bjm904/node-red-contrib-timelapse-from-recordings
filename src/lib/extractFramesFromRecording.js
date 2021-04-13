const path = require('path');
const spawn = require('child_process').spawn;
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const secsBetweenFrames = 1 * 60 * 60; // 1 hr

const extractFramesFromRecording = (node, tmpCamDirectory, fileInfo) => new Promise((resolve, reject) => {
  const inputPath = `${fileInfo.fileName}`;
  const outputPath = `${path.join(tmpCamDirectory, `${fileInfo.timestamp}.jpg`)}`;

  const ffmpegArgs = [
    '-hide_banner',
    '-i', inputPath,
    '-an',
    //'-ss', '00:00:01.000',
    //'-vf', `fps=1/${secsBetweenFrames}`,
    '-vframes', '1',
    '-q:v', '3', // JPG quality 2-31. Lower is better.
    outputPath,
  ];

  const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

  ffmpeg.on('error', (err) => {
    node.warn(err);
  });

  ffmpeg.on('exit', (code) => {
    if (code === 0) {
      fileInfo.done = true;
      resolve();
    } else {
      reject(`ffmpeg exited with code ${code}`);
    }
  });

  if (false) {
    ffmpeg.stdout.on('data', (data) => {
      node.warn(`${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      node.warn(`${data}`);
    });
  }
});

module.exports = extractFramesFromRecording;
