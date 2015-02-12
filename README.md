# Copymitter

Copy files with emitter.

## Install

```
npm i copymitter --save
```

## How to use?

```js
var cw      = process.cwd(),
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
    cp.emit('continue');
});

cp.on('end', function() {
    console.log('end');
});
```

## License

MIT
