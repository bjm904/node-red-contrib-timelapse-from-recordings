const path = require('path');
const spawn = require('child_process').spawn;
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const secsBetweenFrames = 10 * 60; // 10 mins

const extractFramesFromRecording = (tmpCamDirectory, fileInfo) => new Promise((resolve, reject) => {
  const inputPath = `${fileInfo.fileName}`;
  const outputPath = `${path.join(tmpCamDirectory, '%05d.jpg')}`;

  const ffmpegArgs = [
    '-hide_banner',
    '-i', inputPath,
    '-vf', `fps=1/${secsBetweenFrames}`,
    '-q:v', '2', // JPG quality 2-31. Lower is better.
    outputPath,
  ];

  const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

  /*ffmpeg.stdout.on('data', (data) => {
    node.warn(`ffmpeg stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    node.error(`ffmpeg stderr: ${data}`, msg);
  });*/

  ffmpeg.on('error', (err) => {
    reject(err);
  });

  ffmpeg.on('exit', (code) => {
    if (code === '0') {
      resolve();
    } else {
      reject(`ffmpeg exited with code ${code}`);
    }
  });
});

module.exports = extractFramesFromRecording;
