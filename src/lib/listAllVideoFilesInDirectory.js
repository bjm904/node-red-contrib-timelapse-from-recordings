const listAllVideoFilesInDirectory = (directory) => {
  return glob.sync(directory, { nodir: true });
};

module.exports = listAllVideoFilesInDirectory;