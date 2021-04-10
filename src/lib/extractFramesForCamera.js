const fs = require('fs');
const path = require('path');
const extractFramesFromRecording = require('./extractFramesFromRecording');

const extractFramesForCamera = (tmpDirectory, camera, fileInfos = []) => new Promise((resolve, reject) => {
  const tmpCamDirectory = path.join(tmpDirectory, camera);
  fs.mkdirSync(tmpCamDirectory, {recursive: true});

  const promises = fileInfos.map((fileInfo) => (
    extractFramesFromRecording(tmpCamDirectory, fileInfo)
  ));

  Promise.all(promises).then(() => {
    resolve();
  }).catch((err) => {
    reject(err);
  });
});

module.exports = extractFramesForCamera;
