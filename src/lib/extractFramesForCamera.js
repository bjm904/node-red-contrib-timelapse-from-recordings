const fs = require('fs');
const path = require('path');
const extractFramesFromRecording = require('./extractFramesFromRecording');

const processNextRecording = (node, tmpCamDirectory, fileInfos, resolveCamera, i = 0) => {
  const fileInfo = fileInfos[i];
  if (fileInfo) {
    extractFramesFromRecording(node, tmpCamDirectory, fileInfo).catch((err) => {
      node.warn(err);
    }).finally(() => {
      processNextRecording(node, tmpCamDirectory, fileInfos, resolveCamera, i + 1);
    });
  } else {
    resolveCamera();
  }
};

const startProcessingThread = (node, tmpCamDirectory, fileInfos = []) => new Promise((resolve, reject) => {
  processNextRecording(node, tmpCamDirectory, fileInfos, resolve, 0);
});

const extractFramesForCamera = (node, tmpDirectory, threadsPerCamera, camera, fileInfos = []) => new Promise((resolve, reject) => {
  const tmpCamDirectory = path.join(tmpDirectory, camera);
  node.debug(`Creating tmpCamDirectory ${tmpCamDirectory}`);
  fs.mkdirSync(tmpCamDirectory, {recursive: true});

  const fileInfosPerThread = Math.ceil(fileInfos.length / threadsPerCamera);

  const fileInfosByThread = [[]];

  let threadNum = 0;
  fileInfos.forEach((fileInfo) => {
    fileInfosByThread[threadNum].push(fileInfo);
    if (fileInfosByThread[threadNum].length >= fileInfosPerThread) {
      threadNum += 1;
      fileInfosByThread[threadNum] = [];
    }
  });

  const promises = fileInfosByThread.map((fileInfosForThread) => (
    startProcessingThread(node, tmpCamDirectory, fileInfosForThread)
  ));
  Promise.all(promises).catch((err) => {
    node.warn(err);
  }).finally(() => {
    resolve();
  });
});

module.exports = extractFramesForCamera;
