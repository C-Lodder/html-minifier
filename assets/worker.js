(() => {
  'use strict';

  importScripts('../dist/htmlminifier.min.js');
  const minify = require('html-minifier').minify;
  addEventListener('message', ({ data }) => {
    try {
      const options = data.options;
      options.log = message => {
        console.log(message);
      };
      postMessage(minify(data.value, options));
    }
    catch (err) {
      postMessage({
        error: `${err}`
      });
    }
  });
  postMessage(null);
})();
