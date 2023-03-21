# Copymitter [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

Copy files with emitter (even from and to `zip archives`). It will emit event on every percent of copied chunk of data.
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
    'package.json',
]);

cp.on('file', (from, to) => {
    console.log(`${from} -> ${to}`);
});

cp.on('directory', (from, to) => {
    console.log(`${from} -> ${to}`);
});

cp.on('progress', (percent) => {
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

cp.on('error', (error) => {
    console.error(error.message);
    
    if (abortOnError)
        cp.abort();
    else
        cp.continue();
});

cp.on(('abort') => {
    console.log('Copying aborted');
});

cp.on('end', ({errors}) => {
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

[NPMIMGURL]: https://img.shields.io/npm/v/copymitter.svg?style=flat
[BuildStatusURL]: https://github.com/coderaiser/copymitter/actions?query=workflow%3A%22Node+CI%22 "Build Status"
[BuildStatusIMGURL]: https://github.com/coderaiser/copymitter/workflows/Node%20CI/badge.svg
[LicenseIMGURL]: https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[CoverageIMGURL]: https://coveralls.io/repos/coderaiser/node-copymitter/badge.svg?branch=master&service=github
[NPMURL]: https://npmjs.org/package/copymitter "npm"
[LicenseURL]: https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]: https://coveralls.io/github/coderaiser/node-copymitter?branch=master
