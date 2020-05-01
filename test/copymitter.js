'use strict';

const {once} = require('events');

const fs = require('fs');
const path = require('path');
const {tmpdir} = require('os');

const {join, basename} = path;

const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const test = require('supertape');
const tryCatch = require('try-catch');
const wait = require('@iocmd/wait');

const copymitter = require('..');

const temp = () => {
    return fs.mkdtempSync(path.join(tmpdir(), `copymitter-`));
};

test('file: no args', (t) => {
    t.throws(copymitter, /from should be a string!/, 'should throw when no args');
    t.end();
});

test('file: no to', (t) => {
    const fn = () => copymitter('/hello');
    
    t.throws(fn, /to should be a string!/, 'should throw when no to');
    t.end();
});

test('file: no files', (t) => {
    const [e] = tryCatch(copymitter, '/hello', '/world');
    
    t.equal(e.message, 'files should be an array!', 'should throw when no args');
    t.end();
});

test('file: error EACESS', async (t) => {
    const cp = copymitter(__dirname, '/', [
        path.basename(__filename),
    ]);
    
    const [error] = await once(cp, 'error');
    
    t.equal(error.code, 'EACCES', error.message);
    t.end();
});

test('directory: error EACESS', async (t) => {
    const from = path.join(__dirname, '..');
    const name = 'package.json';
    const cp = copymitter(from, '/', [name]);
    
    const [error] = await once(cp, 'error');
    
    t.equal(error.code, 'EACCES', error.message);
    t.end();
});

test('copy 1 file: to: src', async (t) => {
    const from = path.join(__dirname, '/../lib/');
    const to = temp();
    const name = path.basename(__filename);
    const cp = copymitter(from, to, [name]);
    
    const [[progress], [src]] = await Promise.all([
        once(cp, 'progress'),
        once(cp, 'file'),
    ]);
    
    const fromFull = path.join(from, name);
    const toFull = path.join(to, name);
    
    fs.unlinkSync(toFull);
    rimraf.sync(to);
    
    t.equal(src, fromFull, 'file paths should be equal');
    t.end();
});

test('copy 1 file: to: dest', async (t) => {
    const from = path.join(__dirname, '/../lib/');
    const to = temp();
    const name = path.basename(__filename);
    const cp = copymitter(from, to, [name]);
    
    const [[progress], [src, dest]] = await Promise.all([
        once(cp, 'progress'),
        once(cp, 'file'),
    ]);
    
    const full = path.join(to, name);
    fs.unlinkSync(full);
    rimraf.sync(to);
    
    t.equal(dest, full, 'file paths should be equal');
    t.equal(progress, 100, 'progress');
    t.end();
});

test('copy 1 file: to (error: ENOENT, create dir error)', async (t) => {
    const {mkdir} = fs;
    
    const from = path.join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    let was;
    
    fs.mkdir = (name, mode, cb) => {
        if (was)
            return cb(Error('NOT EEXIST'));
        
        was = true;
        cb();
    };
    
    const cp = copymitter(from, to, [name]);
    const [error] = await once(cp, 'error');
    
    cp.abort();
    
    fs.mkdir = mkdir;
    rimraf.sync(to);
    
    t.ok(error, 'should be error: ' + error.message);
    t.end();
});

test('copy 1 file: to (directory exist)', async (t) => {
    const from = path.join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    
    mkdirp.sync(path.join(to, 'lib', 'copymitter.js'));
    const cp = copymitter(from, to, [name]);
    const [n] = await once(cp, 'progress');
    
    if (n === 100)
        t.pass('should equal');
    
    await once(cp, 'end');
    
    rimraf.sync(to);
    t.end();
});

test('copy 1 file: to (directory exist, error mkdir)', async (t) => {
    const {mkdir} = fs;
    
    const from = path.join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    let was;
    
    stub('mkdirp', async () => {
        if (was)
            throw Error('NOT EEXIST');
        
        was = true;
    });
    
    const copymitter = rerequire('..');
    mkdirp.sync(path.join(to, 'lib', 'copymitter.js'));
    
    const cp = copymitter(from, to, [name]);
    
    const [[error]] = await Promise.all([
        once(cp, 'error'),
    ]);
    
    fs.mkdir = mkdir;
    rimraf.sync(to);
    
    t.ok(error, 'should be error: ' + error.message);
    t.end();
});

test('copy 1 file: from', async (t) => {
    const from = path.join(__dirname, '/../lib/');
    const to = temp();
    const name = path.basename(__filename);
    const cp = copymitter(from, to, [name]);
    
    const [[file], [progress]] = await Promise.all([
        once(cp, 'file'),
        once(cp, 'progress'),
        once(cp, 'end'),
    ]);
    
    const full = path.join(from, name);
    const dataFile = fs.readFileSync(file, 'utf8');
    const dataFull = fs.readFileSync(full, 'utf8');
    const statFile = fs.statSync(file);
    const statFull = fs.statSync(full);
    
    t.equal(dataFile, dataFull, 'files data should be equal');
    t.equal(statFile.mode, statFull.mode, 'fils mode should be equal');
    fs.unlinkSync(path.join(to, name));
    
    rimraf.sync(to);
    t.end();
});

test('copy 1 file: from: symlink', async (t) => {
    const from = path.join(__dirname, 'fixture');
    const to = temp();
    const name = 'symlink';
    const cp = copymitter(from, to, [name]);
    
    const [[file]] = await Promise.all([
        once(cp, 'file'),
        once(cp, 'end'),
    ]);
    
    const full = path.join(from, name);
    const dataFile = fs.readFileSync(file, 'utf8');
    const dataFull = fs.readFileSync(full, 'utf8');
    const statFile = fs.statSync(file);
    const statFull = fs.statSync(full);
    
    fs.unlinkSync(path.join(to, name));
    rimraf.sync(to);
    
    t.equal(dataFile, dataFull, 'files data should be equal');
    t.equal(statFile.mode, statFull.mode, 'fils mode should be equal');
    t.end();
});

test('copy directories: exist', async (t) => {
    const to = temp();
    const from = join(__dirname);
    const name = basename(__filename);
    const names = [name];
    const cp = copymitter(from, to, names);
    
    await once(cp, 'end');
    
    const dir = join(to, name);
    const stat = fs.statSync(dir);
    rimraf.sync(to);
    t.ok(stat, 'should copy dir');
    t.end();
});

test('copy directories: emit: dest', async (t) => {
    const from = __dirname;
    const to = temp();
    const name = path.basename(__filename);
    const names = [name];
    const cp = copymitter(from, to, names);
    
    cp.once('directory', (src, dest) => {
        t.ok(dest, 'should emit "dest"');
    });
    
    await once(cp, 'end');
    rimraf.sync(to);
    t.end();
});

test('file: error ENOENT', async (t) => {
    const from = '/';
    const to = temp();
    const cp = copymitter(from, to, [
        Math.random().toString(),
    ]);
    
    const [[error]] = await Promise.all([
        once(cp, 'error'),
    ]);
    
    rimraf.sync(to);
    
    t.equal(error.code, 'ENOENT', error.message);
    t.end();
});

test('pause/continue', async (t) => {
    const from = path.join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    mkdirp.sync(to);
    const cp = copymitter(from, to, [name]);
    
    const pause = cp.pause.bind(cp);
    await Promise.all([
        once(cp, 'pause'),
        wait(pause),
    ]);
    
    cp.continue();
    
    await once(cp, 'end');
    rimraf.sync(to);
    t.pass('should emit pause');
    t.end();
});

function stub(name, fn) {
    require.cache[require.resolve(name)].exports = fn;
}

function rerequire(name) {
    delete require.cache[require.resolve(name)];
    return require(name);
}

