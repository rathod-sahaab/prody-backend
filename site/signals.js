'use strict';

const frontEndHandlingURL =
  'https://istenith.com/prody/server-response.html' + '?';
// necessary to append question mark
const signalFrontend = (options) => {
  return frontEndHandlingURL + new URLSearchParams(options).toString();
};

module.exports = signalFrontend;
