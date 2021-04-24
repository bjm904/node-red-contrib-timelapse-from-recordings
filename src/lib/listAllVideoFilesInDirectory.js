const glob = require('glob');

// This object will also hold caching information added to it by glob
const globOptions = {
  nodir: true,
};

const listAllVideoFilesInDirectory = (directory) => new Promise((resolve, reject) => {
  const globEventEmitter = glob(directory, globOptions);

  globEventEmitter.on('error', (err) => {
    reject(err);
  });

  globEventEmitter.on('end', (matches) => {
    resolve(matches);
  });
});

module.exports = listAllVideoFilesInDirectory;
