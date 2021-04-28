/* eslint-disable camelcase */
const { findClosestIndex } = require('find-closest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const rimraf = require('rimraf');
const extractFramesForCamera = require('./lib/extractFramesForCamera');
const generateTimelapseForCamera = require('./lib/generateTimelapseForCamera');
const interpretFileInfoFromPath = require('./lib/interpretFileInfoFromPath');
const listAllVideoFilesInDirectory = require('./lib/listAllVideoFilesInDirectory');

module.exports = function TimelapseFromRecordingsNodeModule(RED) {
  function TimelapseFromRecordingsNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.nodeConfig = {
      recordings_directory: config['recordings-directory'] || null,
      output_directory: config['output-directory'] || null,
      camera_name: config['camera-name'] || null,
      time_start: config['time-start'] || null,
      time_end: config['time-end'] || null,
      time_previous_hours: config['time-previous-hours'] || null,
      output_target_duration_secs: config['output-duration'] || null,
      output_framerate: config['output-framerate'] || null,
      output_width: config['output-width'] || null,
      output_height: config['output-height'] || null,
      cpu_threads: config['cpu-threads'] || null,
    };

    const tmpDirectory = path.join(os.tmpdir(), 'timelapse-from-recordings');

    node.status({
      fill: 'green',
      shape: 'dot',
      text: 'Ready',
    });

    node.on('input', (msg, send, done) => {
      const {
        recordings_directory = this.nodeConfig.recordings_directory || null,
        output_directory = this.nodeConfig.output_directory || null,
        camera_name = this.nodeConfig.camera_name || '*',
        time_start = this.nodeConfig.time_start || null,
        time_end = this.nodeConfig.time_end || null,
        time_previous_hours = this.nodeConfig.time_previous_hours || 24,
        output_target_duration_secs = this.nodeConfig.output_target_duration_secs || 30,
        output_framerate = this.nodeConfig.output_framerate || 30,
        output_width = this.nodeConfig.output_width || -1,
        output_height = this.nodeConfig.output_height || -1,
        cpu_threads = this.nodeConfig.cpu_threads || 4,
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
      fs.mkdirSync(tmpDirectory, { recursive: true });

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

        node.status({
          fill: 'yellow',
          shape: 'ring',
          text: `Calculating source files to use out of ${fileNames.length} files...`,
        });

        // Figure start and end time for timelapse
        let startTimestamp = time_start;
        let endTimestamp = time_end;

        if (!startTimestamp || !endTimestamp) {
          node.debug(`Missing time_start or time_end. Calculating with time_previous_hours ${time_previous_hours} hrs`);
          endTimestamp = Date.now();
          startTimestamp = endTimestamp - (time_previous_hours * 60 * 60 * 1000);
        }

        // Filter out files that fall outside the time range
        const fileInfosInRange = fileInfosAll.filter((fileInfo) => (
          fileInfo.timestamp > startTimestamp
          && fileInfo.timestamp <= endTimestamp
        ));

        fileInfosInRange.sort((a, b) => a.timestamp - b.timestamp);

        // If we have more frames then seconds in timelapse,
        // then we need to pluck frames from regular intervals
        let fileInfos;
        const numberOfFrames = output_framerate * output_target_duration_secs;
        if (fileInfosInRange.length > numberOfFrames) {
          const msPerFrame = 1000 / output_framerate;
          fileInfos = [];
          // Go frame by frame (output) and pluck source files
          for (let frameNumber = 0; frameNumber < numberOfFrames; frameNumber += 1) {
            // Check if we have any frames left, hopefully this check is unneeded
            if (fileInfosInRange.length > 0) {
              // Calculate the UNIX timestamp ms that is the target time for our frame
              const targetFrameTimestamp = startTimestamp + (frameNumber * msPerFrame);
              const closestFileInfoIndex = findClosestIndex(fileInfosInRange, targetFrameTimestamp, ({ timestamp }) => timestamp);

              let closestFileInfo;
              /*
                We just take the first file even if the second's timestamp is closer.
                This avoids an issue where if there are 101 fileInfos and only 100 frames,
                we can accidentially jump ahead once or twice because the next file's timestamp
                is technically closer to out target timestamp. And because we discard
                previous frames, by the end we will run out of frames to use.
              */
              if (closestFileInfoIndex === 0 || closestFileInfoIndex === 1) {
                [closestFileInfo] = fileInfosInRange.splice(0, 1);
              } else {
                const closestAndPreviousFileInfos = fileInfosInRange.splice(0, closestFileInfoIndex);
                closestFileInfo = closestAndPreviousFileInfos[closestAndPreviousFileInfos.length - 1];
              }

              fileInfos.push(closestFileInfo);
            }
          }
        } else {
          fileInfos = fileInfosInRange;
        }

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
          const fileInfosDone = fileInfos.filter((f) => f.done);
          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `Extracting frames ${fileInfosDone.length} of ${fileInfos.length}`,
          });
        }, 3000);

        Promise.all(promisesExtract).catch((err) => {
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

          Promise.all(promisesGenerate).catch((err) => {
            node.error(err, msg);
          }).finally(() => {
            node.status({
              fill: 'green',
              shape: 'dot',
              text: 'Done',
            });
            send(msg);
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
};
