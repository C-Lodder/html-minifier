'use strict';

function qunitVersion() {
  const prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = () => '';
  try {
    return require('qunit').version;
  }
  finally {
    Error.prepareStackTrace = prepareStackTrace;
  }
}

module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt);
  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    qunit_ver: qunitVersion(),
    banner: '/*!\n' +
            ' * HTMLMinifier v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
            ' * Copyright 2010-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under the <%= pkg.license %> license\n' +
            ' */\n',

    browserify: {
      src: {
        options: {
          banner: '<%= banner %>',
          preBundleCB() {
            const fs = require('fs');
            const path = require('path');
            const terser = require('terser');
            const files = {};
            const terserPath = `${path.resolve()}/node_modules/terser/dist`;
            const FILES = fs.readdirSync(terserPath).map(file => path.join(terserPath, file));

            FILES.forEach(file => {
              files[file] = fs.readFileSync(file, 'utf8');
            });
            fs.writeFileSync('./dist/uglify.js', terser.minify(files, {
              compress: false,
              mangle: false,
              wrap: 'exports'
            }).code);
          },
          postBundleCB(err, src, next) {
            require('fs').unlinkSync('./dist/uglify.js');
            next(err, src);
          },
          require: [
            './dist/uglify.js:uglify-js',
            './src/htmlminifier.js:html-minifier'
          ]
        },
        src: 'src/htmlminifier.js',
        dest: 'dist/htmlminifier.js'
      }
    },

    eslint: {
      grunt: {
        src: 'Gruntfile.js'
      },
      src: {
        src: ['cli.js', 'src/**/*.js']
      },
      tests: {
        src: ['tests/*.js', 'test.js']
      },
      web: {
        src: ['assets/master.js', 'assets/worker.js']
      },
      other: {
        src: ['backtest.js', 'benchmark.js']
      }
    },

    qunit: {
      htmlminifier: ['./tests/minifier', 'tests/index.html']
    },

    replace: {
      './index.html': [
        /(<h1>.*?<span>).*?(<\/span><\/h1>)/,
        '$1(v<%= pkg.version %>)$2'
      ],
      './tests/index.html': [
        /("[^"]+\/qunit-)[0-9.]+?(\.(?:css|js)")/g,
        '$1<%= qunit_ver %>$2'
      ]
    },

    babel: {
      options: {
        sourceMap: false,
        presets: ['@babel/preset-env']
      },
      dist: {
        files: {
          'dist/htmlminifier.js': '<%= browserify.src.dest %>'
        }
      }
    },

    uglify: {
      options: {
        banner: '<%= banner %>',
        compress: true,
        mangle: true,
        preserveComments: false,
        report: 'min'
      },
      dist: {
        files: {
          'dist/htmlminifier.min.js': 'dist/htmlminifier.js'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('gruntify-eslint');

  function report(type, details) {
    grunt.log.writeln(`${type} completed in ${details.runtime}ms`);
    details.failures.forEach(details => {
      grunt.log.error();
      grunt.log.error(details.name + (details.message ? ` [${details.message}]` : ''));
      grunt.log.error(details.source);
      grunt.log.error('Actual:');
      grunt.log.error(details.actual);
      grunt.log.error('Expected:');
      grunt.log.error(details.expected);
    });
    grunt.log[details.failed ? 'error' : 'ok'](`${details.passed} of ${details.total} passed, ${details.failed} failed`);
    return details.failed;
  }

  const phantomjs = require('phantomjs-prebuilt').path;
  grunt.registerMultiTask('qunit', function() {
    const done = this.async();
    const errors = [];

    function run(testType, binPath, testPath) {
      grunt.util.spawn({
        cmd: binPath,
        args: ['test.js', testPath]
      }, (error, { stderr, stdout }) => {
        if (error) {
          grunt.log.error(stderr);
          grunt.log.error(`${testType} test failed to load`);
          errors.push(-1);
        }
        else {
          let output = stdout;
          const index = output.lastIndexOf('\n');
          if (index !== -1) {
            // There's something before the report JSON
            // Log it to the console -- it's probably some debug output:
            console.log(output.slice(0, index));
            output = output.slice(index);
          }
          errors.push(report(testType, JSON.parse(output)));
        }
        if (errors.length === 2) {
          done(!errors[0] && !errors[1]);
        }
      });
    }

    run('node', process.argv[0], this.data[0]);
    run('web', phantomjs, this.data[1]);
  });

  grunt.registerMultiTask('replace', function() {
    const pattern = this.data[0];
    const path = this.target;
    let html = grunt.file.read(path);
    html = html.replace(pattern, this.data[1]);
    grunt.file.write(path, html);
  });

  grunt.registerTask('dist', [
    'replace',
    'browserify',
    'babel',
    'uglify'
  ]);

  grunt.registerTask('test', [
    'eslint',
    'dist',
    'qunit'
  ]);

  grunt.registerTask('default', 'test');

  process.on('exit', () => {
    if (!match) {
      process.exit(1);
    }
  });
};
