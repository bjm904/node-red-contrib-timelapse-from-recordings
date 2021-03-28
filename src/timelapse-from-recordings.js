module.exports = function(RED) {
  function TimelapseFromRecordingsNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const spawn = require('child_process').spawn;

    node.status({
      fill: 'green',
      shape: 'dot',
      text: 'Ready',
    });

    node.on('input', function(msg, send, done) {
      const ffmpeg = spawn(ffmpegPath, []);
   
      ffmpeg.stdout.on('data', function(data) {
          node.warn(`stdout: ${data}`);
      });

      ffmpeg.stderr.on('data', function(data) {
          node.error(`stderr: ${data}`);
      });

      ffmpeg.on('error', function(error) {
          node.error(`error: ${error.message}`);
      });

      ffmpeg.on('exit', function(code) {
          node.warn(`child process exited with code ${code}`);
          return msg;
      });

      send(msg);

      done();
    });

    node.on('close', function() {
      
    });
  }

  RED.nodes.registerType('timelapse-from-recordings', TimelapseFromRecordingsNode);
}
