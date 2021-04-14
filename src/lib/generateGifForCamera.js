const fs = require('fs');
const GIFEncoder = require('gifencoder'); 
const path = require('path');
const pngFileStream = require('png-file-stream');
const spawn = require('child_process').spawn;

const gifPerams = {
  repeat: 1,
  delay: 500,
  quality: 10,
};

const generateGifForCamera = (node, tmpDirectory, camera) => new Promise((resolve, reject) => {
  const tmpCamDirectory = path.join(tmpDirectory, camera);
  const inputFilesPath = path.join(tmpCamDirectory, '*.png');
  const outputPath = path.join(tmpCamDirectory, 'output.gif');
  
  node.debug(`Creating gif ${outputPath}`);

  //TODO: Pull dimensions from sample file
  const encoder = new GIFEncoder(1920, 1080);

  const stream = pngFileStream(inputFilesPath);
  stream.pipe(encoder.createWriteStream(gifPerams))
  stream.pipe(fs.createWriteStream(outputPath));

  stream.on('finish', () => {
    resolve();
  });
});

module.exports = generateGifForCamera;