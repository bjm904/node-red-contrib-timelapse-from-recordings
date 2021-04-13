const fs = require('fs');
const os = require('os');
const path = require('path');
const rimraf = require('rimraf');
const extractFramesForCamera = require('./lib/extractFramesForCamera');
const generateGifForCamera = require('./lib/generateGifForCamera');
const interpretFileInfoFromPath = require('./lib/interpretFileInfoFromPath');
const listAllVideoFilesInDirectory = require('./lib/listAllVideoFilesInDirectory');

module.exports = function(RED) {
  function TimelapseFromRecordingsNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.debug = node.warn;

    // nrctfr = node-red-contrib-timelapse-from-recordings
    //const tmpDirectory = path.join(os.tmpdir(), 'nrctfr');

    node.status({
      fill: 'green',
      shape: 'dot',
      text: 'Ready',
    });

    node.on('input', (msg, send, done) => {
      const tmpDirectory = path.join(msg.outputDirectory, 'nrctfr');
      // Recreate tmp directory
      node.status({
        fill: 'yellow',
        shape: 'ring',
        text: `Cleaning tmp directory ${tmpDirectory}`,
      });
      rimraf.sync(tmpDirectory);
      fs.mkdirSync(tmpDirectory, {recursive: true});

      // List all files
      node.status({
        fill: 'yellow',
        shape: 'ring',
        text: `Getting recordings from ${msg.recordingsDirectory}`,
      });
      listAllVideoFilesInDirectory(msg.recordingsDirectory).then((fileNames) => {
        // Parse all file names for camera and date
        node.status({
          fill: 'yellow',
          shape: 'ring',
          text: `Interpreting ${fileNames.length} file names...`,
        });
        const fileInfos = fileNames.map(interpretFileInfoFromPath);

        // Organize fileInfos by camera
        const fileInfosByCamera = {};
        fileInfos.forEach((fileInfo) => {
          const { camera } = fileInfo;

          if (camera) {
            if (!fileInfosByCamera[camera]) {
              node.debug(`Found new camera ${camera}`);
              fileInfosByCamera[camera] = [];
            }
            fileInfosByCamera[camera].push(fileInfo);
          }
        });

        // Count the cameras
        const cameraNames = Object.keys(fileInfosByCamera);

        cameraNames.splice(1); // REMOVE THIS

        node.status({
          fill: 'yellow',
          shape: 'ring',
          text: `Found ${cameraNames.length} cameras`,
        });
        
        // Extract frames from recordings
        const promisesExtract = cameraNames.map((camera) => (
          extractFramesForCamera(node, tmpDirectory, camera, fileInfosByCamera[camera])
        ));

        const statusUpdateInterval = setInterval(() => {
          const fileInfosDone = fileInfos.filter(f => f.done);
          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `Extracting frames. Finished ${fileInfosDone.length} of ${fileInfos.length}`,
          });
        }, 1000);

        Promise.all(promisesExtract).catch((err) =>{
          node.error(err, msg);
        }).finally(() => {
          clearInterval(statusUpdateInterval);

          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `Generating GIFs for ${cameraNames.length} cameras`,
          });

          const promisesGenerate = cameraNames.map((camera) => (
            generateGifForCamera(node, tmpDirectory, camera)
          ));

          Promise.all(promisesGenerate).catch((err) =>{
            node.error(err, msg);
          }).finally(() => {
            node.status({
              fill: 'green',
              shape: 'dot',
              text: 'Done',
            });
            send(msg);
            done();
          });
        });
      }).catch((err) => {
        node.error(err, msg);
      });
    });

    node.on('close', () => {
      // Cleanup tmp directory
      rimraf.sync(tmpDirectory);
    });
  }

  RED.nodes.registerType('timelapse-from-recordings', TimelapseFromRecordingsNode);
}
