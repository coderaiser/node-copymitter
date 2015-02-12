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

cp.on('file', function(name) {
    console.log(name);
});

cp.on('error', function(error, name) {
    console.error(name, ':', error.message);
    cp.emit('continue');
});

cp.on('end', function() {
    console.log('end');
});
```

## License

MIT
