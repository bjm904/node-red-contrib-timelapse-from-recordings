const listAllVideoFilesInDirectory = require('./lib/listAllVideoFilesInDirectory');

module.exports = (RED) => {
  const TimelapseFromRecordingsNode = (config) => {
    RED.nodes.createNode(this, config);
    const node = this;
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const spawn = require('child_process').spawn;

    node.status({
      fill: 'green',
      shape: 'dot',
      text: 'Ready',
    });

    node.on('input', (msg, send, done) => {
      const files = listAllVideoFilesInDirectory(msg.directory);

      node.warn(files);

      const ffmpeg = spawn(ffmpegPath, []);
   
      ffmpeg.stdout.on('data', (data) => {
          node.warn(`stdout: ${data}`);
      });

      ffmpeg.stderr.on('data', (data) => {
          node.error(`stderr: ${data}`);
      });

      ffmpeg.on('error', (error) => {
          node.error(`error: ${error.message}`);
      });

      ffmpeg.on('exit', (code) => {
          node.warn(`child process exited with code ${code}`);
          return msg;
      });

      send(msg);

      done();
    });

    node.on('close', () => {
      
    });
  };

  RED.nodes.registerType('timelapse-from-recordings', TimelapseFromRecordingsNode);
}
