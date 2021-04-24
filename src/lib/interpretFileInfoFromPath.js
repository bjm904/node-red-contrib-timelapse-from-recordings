const interpretFileInfoFromPath = (fileName) => {
  const nameArray = fileName.split('/');
  const nameArrayReversed = nameArray.reverse();
  /*
  Note: I considered stat-ing all the files to get date created or modified.
  However, that takes way too long and we have to pull camera name somehow anyway
  This is the only? issue that makes this "frigate" compatable only
  */
  const yearMonthPieces = nameArrayReversed[4].split('-');
  const year = yearMonthPieces[0]; // In top directory name before dash
  const month = yearMonthPieces[1]; // In top directory name after dash

  const day = nameArrayReversed[3]; // Is second directory name
  const hour = nameArrayReversed[2]; // Is third directory name
  const camera = nameArrayReversed[1]; // Is fourth directory name

  const fileNamePieces = nameArrayReversed[0].split('.');
  const minute = fileNamePieces[0]; // In file name before first dot
  const second = fileNamePieces[1]; // In file name after first dot

  const fileDate = new Date(year, month - 1, day, hour, minute, second);

  const fileInfo = {
    fileName,
    camera,
    timestamp: fileDate.valueOf(),
  };
  return fileInfo;
};

module.exports = interpretFileInfoFromPath;
