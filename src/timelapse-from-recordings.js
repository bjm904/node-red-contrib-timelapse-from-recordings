const fs = require('fs');
const os = require('os');
const path = require('path');
const rimraf = require('rimraf');
const extractFramesForCamera = require('./lib/extractFramesForCamera');
const interpretFileInfoFromPath = require('./lib/interpretFileInfoFromPath');
const listAllVideoFilesInDirectory = require('./lib/listAllVideoFilesInDirectory');

module.exports = function(RED) {
  function TimelapseFromRecordingsNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // nrctfr = node-red-contrib-timelapse-from-recordings
    const tmpDirectory = path.join(os.tmpdir(), 'nrctfr');

    node.status({
      fill: 'green',
      shape: 'dot',
      text: 'Ready',
    });

    node.on('input', (msg, send, done) => {
      // Recreate tmp directory
      node.debug(`Using tmp directory ${tmpDirectory}`);
      node.status({
        fill: 'yellow',
        shape: 'ring',
        text: `Getting tmp directory ready ${tmpDirectory}`,
      });
      rimraf.sync(tmpDirectory);
      fs.mkdirSync(tmpDirectory, {recursive: true});

      // List all files
      node.debug(`Looking in recordings directory ${msg.recordingsDirectory}`);
      node.status({
        fill: 'yellow',
        shape: 'ring',
        text: `Getting recordings from ${msg.recordingsDirectory}`,
      });
      listAllVideoFilesInDirectory(msg.recordingsDirectory).then((fileNames) => {
        // Parse all file names for camera and date
        node.debug(`Found ${fileNames.length} files to process`);
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
        node.status({
          fill: 'yellow',
          shape: 'ring',
          text: `Found ${cameraNames.length} cameras`,
        });
        
        // Process recordings one camera at a time
        const promises = cameraNames.map((camera) => (
          extractFramesForCamera(tmpDirectory, camera, fileInfosByCamera[camera])
        ));

        node.status({
          fill: 'yellow',
          shape: 'ring',
          text: 'Grabbing frames...',
        });

        Promise.all(promises).catch((err) =>{
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
