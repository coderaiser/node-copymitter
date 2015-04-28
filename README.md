# Copymitter [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL]

Copy files with emitter.

## Global

`Copymitter` could be installed global with

```
npm i copymitter -g
```
And used this way:

```
Usage: copymitter [filename] [distanation path]
Options:
  -h, --help      display this help and exit
  -v, --version   output version information and exit
```

## Local

`Copymitter` could be used localy. It will emit event on every copied file.
Good for making progress bars.

### Install

```
npm i copymitter --save
```

### How to use?

```js
var copymitter    = require('copymitter'),
    cwd           = process.cwd(),
    from          = cwd + '/pipe-io',
    to            = cwd + '/example',
    abortOnError  = false;
    
cp = copymitter(from, to, [
    'LICENSE',
    'README.md',
    'package.json'
]);

cp.on('file', function(name) {
    console.log(name);
});

cp.on('progress', function(percent) {
    console.log(percent);
    
    if (percent >= 50) {
        cp.pause();
        cp.continue();
    }
});

cp.on('error', function(error, name, i, percent) {
    console.error(percent, ' -> ', name, ':', error.message);
    
    if (abortOnError)
        cp.abort();
    else
        cp.continue();
});

cp.on('end', function() {
    console.log('Copying ended up');
});
```

In case of starting example output should be similar to:

```
33%
67%
100%
Copying ended up
```

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/copymitter.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/node-copymitter/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/node-copymitter.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/copymitter "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/node-copymitter  "Build Status"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/node-copymitter "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

