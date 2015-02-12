# Copymitter

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
var cwd     = process.cwd(),
    from    = cwd + '/pipe-io',
    to      = cwd + '/example';
    
cp = copymitor(from, to, [
    'LICENSE',
    'README.md',
    'package.json'
]);

cp.on('file', function(name, name, i, percent) {
    console.log(percent, ' ', name);
});

cp.on('error', function(error, name, i, percent) {
    console.error(percent, ' ', name, ':', error.message);
    cp.continue();
});

cp.on('end', function() {
    console.log('end');
});
```

## License

MIT
