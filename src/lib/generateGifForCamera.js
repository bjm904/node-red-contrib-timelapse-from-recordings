const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;

const gifPerams = {
  repeat: 1,
  delay: 500,
  quality: 10,
};

const generateGifForCamera = (node, tmpDirectory, camera) => new Promise((resolve, reject) => {
  const tmpCamDirectory = path.join(tmpDirectory, camera);
  const inputFilesPath = path.join(tmpCamDirectory, '%d.png');
  const outputVideoPath = path.join(tmpCamDirectory, 'video.avi');
  const outputPath = path.join(tmpCamDirectory, 'output.gif');
  
  node.debug(`Creating video ${outputVideoPath}`);

  const ffmpegVideoArgs = [
    '-hide_banner',
    '-i', inputFilesPath,
    outputVideoPath,
  ];

  const ffmpegVideo = spawn(ffmpegPath, ffmpegVideoArgs);

  ffmpegVideo.on('error', (err) => {
    node.warn(err);
  });

  if (false) {
    ffmpegVideo.stdout.on('data', (data) => {
      node.warn(`${data}`);
    });

    ffmpegVideo.stderr.on('data', (data) => {
      node.warn(`${data}`);
    });
  }

  ffmpegVideo.on('exit', (code) => {
    if (code === 0) {
      node.debug(`Creating gif ${outputPath}`);

      const ffmpegGifArgs = [
        '-hide_banner',
        '-i', outputVideoPath,
        '-pix_fmt', 'rgb24',
        '-loop', '0',
        outputPath,
      ];
    
      const ffmpegGif = spawn(ffmpegPath, ffmpegGifArgs);
    
      ffmpegGif.on('error', (err) => {
        node.warn(err);
      });
    
      ffmpegGif.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(`ffmpegGif exited with code ${code}`);
        }
      });
    
      if (false) {
        ffmpegGif.stdout.on('data', (data) => {
          node.warn(`${data}`);
        });
    
        ffmpegGif.stderr.on('data', (data) => {
          node.warn(`${data}`);
        });
      }
    } else {
      reject(`ffmpeg exited with code ${code}`);
    }
  });
});

module.exports = generateGifForCamera;