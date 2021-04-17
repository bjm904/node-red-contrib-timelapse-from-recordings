const fs = require('fs');
const os = require('os');
const path = require('path');
const rimraf = require('rimraf');
const extractFramesForCamera = require('./lib/extractFramesForCamera');
const generateTimelapseForCamera = require('./lib/generateTimelapseForCamera');
const interpretFileInfoFromPath = require('./lib/interpretFileInfoFromPath');
const listAllVideoFilesInDirectory = require('./lib/listAllVideoFilesInDirectory');

module.exports = function(RED) {
  function TimelapseFromRecordingsNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // nrctfr = node-red-contrib-timelapse-from-recordings
    //const tmpDirectory = path.join('/unraid/Media/frigate/timelapses', 'nrctfr');
    const tmpDirectory = path.join(os.tmpdir(), 'nrctfr');

    node.status({
      fill: 'green',
      shape: 'dot',
      text: 'Ready',
    });

    node.on('input', (msg, send, done) => {
      const {
        cpu_threads = 4,
        camera_name = '*',
        recordings_directory,
        output_directory,
        time_previous_hours = 24,
        time_start = null,
        time_end = null,
        output_width = -1,
        output_height = -1,
        output_framerate = 30,
      } = msg;

      if (!recordings_directory) {
        node.error('You must define recordings_directory', msg);
        return;
      }

      if (!output_directory) {
        node.error('You must define output_directory', msg);
        return;
      }

      // Recreate tmp directory
      node.status({
        fill: 'yellow',
        shape: 'ring',
        text: `Cleaning tmp directory ${tmpDirectory}`,
      });
      rimraf.sync(tmpDirectory);
      fs.mkdirSync(tmpDirectory, {recursive: true});

      // List all files
      const targetRecordingsDirectory = path.join(recordings_directory, '/*/*/*/', camera_name, '/*');
      node.status({
        fill: 'yellow',
        shape: 'ring',
        text: `Getting recordings from ${targetRecordingsDirectory}`,
      });
      listAllVideoFilesInDirectory(targetRecordingsDirectory).then((fileNames) => {
        // Parse all file names for camera and date
        node.status({
          fill: 'yellow',
          shape: 'ring',
          text: `Interpreting ${fileNames.length} file names...`,
        });
        const fileInfosAll = fileNames.map(interpretFileInfoFromPath);

        // Figure start and end time for timelapse
        let startTimestamp = time_start;
        let endTimestamp = time_end;

        if (!startTimestamp || !endTimestamp) {
          endTimestamp = Date.now();
          startTimestamp = endTimestamp - (time_previous_hours * 60 * 60 * 1000);
        }

        // Filter out files that fall outside the time range
        const fileInfos = fileInfosAll.filter((fileInfo) => (
          fileInfo.timestamp > startTimestamp
          && fileInfo.timestamp <= endTimestamp
        ));

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
        
        // Extract frames from recordings
        const threadsPerCamera = Math.max(1, Math.floor(cpu_threads / cameraNames.length));
        const promisesExtract = cameraNames.map((camera) => (
          extractFramesForCamera(node, tmpDirectory, threadsPerCamera, camera, fileInfosByCamera[camera])
        ));

        const statusUpdateInterval = setInterval(() => {
          const fileInfosDone = fileInfos.filter(f => f.done);
          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `Extracting frames ${fileInfosDone.length} of ${fileInfos.length}`,
          });
        }, 3000);

        Promise.all(promisesExtract).catch((err) =>{
          node.error(err, msg);
        }).finally(() => {
          clearInterval(statusUpdateInterval);

          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `Generating timelapse for ${cameraNames.join(' & ')}`,
          });

          const promisesGenerate = cameraNames.map((camera) => (
            generateTimelapseForCamera(node, tmpDirectory, threadsPerCamera, camera, output_directory, output_width, output_height, output_framerate)
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
