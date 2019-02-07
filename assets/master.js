(() => {
  'use strict';

  let minify = (() => {
    const minify = require('html-minifier').minify;
    return (value, options, callback, errorback) => {
      options.log = message => {
        console.log(message);
      };
      let minified;
      try {
        minified = minify(value, options);
      }
      catch (err) {
        return errorback(err);
      }
      callback(minified);
    };
  })();
  if (typeof Worker === 'function') {
    const worker = new Worker('assets/worker.js');
    worker.onmessage = () => {
      minify = (value, options, callback, errorback) => {
        worker.onmessage = event => {
          const data = event.data;
          if (data.error) {
            errorback(data.error);
          }
          else {
            callback(data);
          }
        };
        worker.postMessage({
          value,
          options
        });
      };
    };
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHTML(str) {
    return `${str}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function forEachOption(fn) {
    [].forEach.call(byId('options').getElementsByTagName('input'), fn);
  }

  function getOptions() {
    const options = {};
    forEachOption(element => {
      const key = element.id;
      let value;
      if (element.type === 'checkbox') {
        value = element.checked;
      }
      else {
        value = element.value.replace(/^\s+|\s+$/, '');
        if (!value) {
          return;
        }
      }
      switch (key) {
        case 'maxLineLength':
          value = parseInt(value);
          break;
        case 'processScripts':
          value = value.split(/\s*,\s*/);
      }
      options[key] = value;
    });
    return options;
  }

  function commify(str) {
    return String(str)
      .split('').reverse().join('')
      .replace(/(...)(?!$)/g, '$1,')
      .split('').reverse().join('');
  }

  byId('minify-btn').onclick = () => {
    byId('minify-btn').disabled = true;
    const originalValue = byId('input').value;
    minify(originalValue, getOptions(), minifiedValue => {
      const diff = originalValue.length - minifiedValue.length;
      const savings = originalValue.length ? (100 * diff / originalValue.length).toFixed(2) : 0;

      byId('output').value = minifiedValue;

      byId('stats').innerHTML =
        `<span class="success">Original size: <strong>${commify(originalValue.length)}</strong>. Minified size: <strong>${commify(minifiedValue.length)}</strong>. Savings: <strong>${commify(diff)} (${savings}%)</strong>.</span>`;
      byId('minify-btn').disabled = false;
    }, err => {
      byId('output').value = '';
      byId('stats').innerHTML = `<span class="failure">${escapeHTML(err)}</span>`;
      byId('minify-btn').disabled = false;
    });
  };

  byId('select-all').onclick = () => {
    forEachOption(element => {
      if (element.type === 'checkbox') {
        element.checked = true;
      }
    });
    return false;
  };

  byId('select-none').onclick = () => {
    forEachOption(element => {
      if (element.type === 'checkbox') {
        element.checked = false;
      }
      else {
        element.value = '';
      }
    });
    return false;
  };

  const defaultOptions = getOptions();
  byId('select-defaults').onclick = () => {
    for (const key in defaultOptions) {
      const element = byId(key);
      element[element.type === 'checkbox' ? 'checked' : 'value'] = defaultOptions[key];
    }
    return false;
  };
})();

/* eslint-disable */
((i, s, o, g, r, a, m) => {i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(...args) {
(i[r].q=i[r].q||[]).push(args)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(
  window,
  document,
  'script',
  '//www.google-analytics.com/analytics.js',
  'ga'
);

ga('create', 'UA-1128111-22', 'auto');
ga('send', 'pageview');

(i => {
  const s = document.getElementById(i);
  const f = document.createElement('iframe');
  f.src = `${document.location.protocol === 'https:' ? 'https' : 'http'}://api.flattr.com/button/view/?uid=kangax&button=compact&url=${encodeURIComponent(document.URL)}`;
  f.title = 'Flattr';
  f.height = 20;
  f.width = 110;
  f.style.borderWidth = 0;
  s.parentNode.insertBefore(f, s);
})('wrapper');
