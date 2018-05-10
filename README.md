# Copymitter [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

Copy files with emitter. It will emit event on every percent of copied chunk of data.
Good for making progress bars.

### Install

```
npm i copymitter
```

### How to use?

```js
const copymitter = require('copymitter');
const cwd = process.cwd();
const from = cwd + '/pipe-io';
const to = cwd + '/example';
const abortOnError = false;

const cp = copymitter(from, to, [
    'LICENSE',
    'README.md',
    'package.json'
]);

cp.on('file', function(from, to) {
    console.log(`${from} -> ${to}`);
});

cp.on('directory', function(from, to) {
    console.log(`${from} -> ${to}`);
});

cp.on('progress', function(percent) {
    console.log(percent);
    
    if (percent >= 50) {
        cp.pause();
        cp.continue();
    }
});

cp.on('pause', () => {
    console.log('paused');
    cp.continue();
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

cp.pause();
```

## Related

- [Remy](https://github.com/coderaiser/node-remy "Remy") - Remove files with emitter.
- [Jaguar](https://github.com/coderaiser/node-jaguar "Jaguar") - Pack and extract .tar.gz archives with emitter.
- [OneZip](https://github.com/coderaiser/node-onezip "OneZip") - Pack and extract zip archives with emitter.
- [Tar-to-zip](https://github.com/coderaiser/node-tar-to-zip "tar-to-zip") - Convert tar and tar.gz archives to zip.

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/copymitter.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/node-copymitter/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/david/coderaiser/node-copymitter.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[CoverageIMGURL]:           https://coveralls.io/repos/coderaiser/node-copymitter/badge.svg?branch=master&service=github
[NPMURL]:                   https://npmjs.org/package/copymitter "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/node-copymitter  "Build Status"
[DependencyStatusURL]:      https://david-dm.org/coderaiser/node-copymitter "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]:              https://coveralls.io/github/coderaiser/node-copymitter?branch=master

