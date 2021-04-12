const {execFile} = require('child_process');
const fs = require('fs');
const path = require('path');
const gifsicle = require('gifsicle');

const generateGifForCamera = (node, tmpDirectory) => new Promise((resolve, reject) => {
  const tmpCamDirectory = path.join(tmpDirectory, camera);
  const inputFilesPath = path.join(tmpCamDirectory, '*.jpg');
  const outputPath = path.join(tmpCamDirectory, 'output.gif');
  
  node.debug(`Creating gif ${outputPath}`);
  execFile(gifsicle, ['-o', outputPath, inputFilesPath], (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
});

module.exports = generateGifForCamera;