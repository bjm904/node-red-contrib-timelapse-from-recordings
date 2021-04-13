const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;

const gifsiclePath = path.resolve(__dirname, '../bin/gifsicle');
fs.chmodSync(gifsiclePath, '777');

const generateGifForCamera = (node, tmpDirectory, camera) => new Promise((resolve, reject) => {
  const tmpCamDirectory = path.join(tmpDirectory, camera);
  const inputFilesPath = path.join(tmpCamDirectory, '*.jpg');
  const outputPath = path.join(tmpCamDirectory, 'output.gif');
  
  node.debug(`Creating gif ${outputPath}`);
  const gifsicle = spawn(gifsiclePath, ['-o', outputPath, inputFilesPath]);

  gifsicle.on('error', (err) => {
    node.warn(err);
  });

  gifsicle.on('exit', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(`gifsicle exited with code ${code}`);
    }
  });

  if (true) {
    gifsicle.stdout.on('data', (data) => {
      node.warn(`${data}`);
    });

    gifsicle.stderr.on('data', (data) => {
      node.warn(`${data}`);
    });
  }
});

module.exports = generateGifForCamera;