'use strict';

const {once} = require('events');

const fs = require('fs');
const {
    mkdir,
    rm,
    copyFile,
} = require('fs/promises');
const {tmpdir} = require('os');
const {join, basename} = require('path');

const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const {test} = require('supertape');
const tryCatch = require('try-catch');

const wait = require('@iocmd/wait');
const mockRequire = require('mock-require');
const {
    read,
    readStat,
    remove,
} = require('redzip');
const pullout = require('pullout');

const copymitter = require('..');

const {reRequire, stopAll} = mockRequire;

const temp = () => {
    return fs.mkdtempSync(join(tmpdir(), `copymitter-`));
};

test('file: no args', (t) => {
    const [error] = tryCatch(copymitter);
    
    t.equal(error.message, 'from should be a string!', 'should throw when no args');
    t.end();
});

test('file: no to', (t) => {
    const [error] = tryCatch(copymitter, 'hello');
    
    t.equal(error.message, 'to should be a string!', 'should throw when no to');
    t.end();
});

test('file: no files', (t) => {
    const [e] = tryCatch(copymitter, '/hello', '/world');
    
    t.equal(e.message, 'files should be an array!', 'should throw when no args');
    t.end();
});

test('file: error EACESS', async (t) => {
    const cp = copymitter(__dirname, '/', [
        basename(__filename),
    ]);
    
    const [error] = await once(cp, 'error');
    
    t.ok(error, error.message);
    t.end();
});

test('directory: error EACESS', async (t) => {
    const from = join(__dirname, '..');
    const name = 'package.json';
    const cp = copymitter(from, '/', [name]);
    
    const [error] = await once(cp, 'error');
    
    t.ok(error, error.message);
    t.end();
});

test('copy 1 file: to: src', async (t) => {
    const from = join(__dirname, '/../lib/');
    const to = temp();
    const name = basename(__filename);
    const cp = copymitter(from, to, [name]);
    
    const [[progress], [src]] = await Promise.all([
        once(cp, 'progress'),
        once(cp, 'file'),
    ]);
    
    const fromFull = join(from, name);
    
    await rm(to, {
        force: true,
        recursive: true,
    });
    
    t.equal(src, fromFull, 'file paths should be equal');
    t.end();
});

test('copy 1 file: to: dest', async (t) => {
    const from = join(__dirname, '/../lib/');
    const to = temp();
    const name = basename(__filename);
    const cp = copymitter(from, to, [name]);
    
    const [[progress], [src, dest]] = await Promise.all([
        once(cp, 'progress'),
        once(cp, 'file'),
    ]);
    
    const full = join(to, name);
    
    await rm(to, {
        recursive: true,
        force: true,
    });
    
    t.equal(dest, full, 'file paths should be equal');
    t.equal(progress, 100, 'progress');
    t.end();
});

test('copy 1 file: to (error: ENOENT, create dir error)', async (t) => {
    const from = join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    
    let was = false;
    const write = () => {
        if (was)
            throw Error('NOT EEXIST');
        
        was = true;
    };
    
    mockRequire('redzip', {
        write,
    });
    
    const copymitter = reRequire('..');
    const cp = copymitter(from, to, [name]);
    const [error] = await once(cp, 'error');
    
    cp.abort();
    
    rimraf.sync(to);
    stopAll();
    
    t.ok(error, 'should be error: ' + error.message);
    t.end();
});

test('copy 1 file: to (directory exist)', async (t) => {
    const from = join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    
    await mkdir(to, {
        recursive: true,
    });
    
    const cp = copymitter(from, to, [name]);
    const [n] = await once(cp, 'progress');
    
    if (n === 100)
        t.pass('should equal');
    
    await once(cp, 'end');
    
    await rm(to, {
        recursive: true,
        force: true,
    });
    
    t.end();
});

test('copy 1 file: to (directory exist, error mkdir)', async (t) => {
    const from = join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    
    let was = false;
    const write = () => {
        if (was)
            throw Error('NOT EEXIST');
        
        was = true;
    };
    
    mockRequire('redzip', {
        write,
    });
    
    const copymitter = reRequire('..');
    mkdirp.sync(join(to, 'lib', 'copymitter.js'));
    
    const cp = copymitter(from, to, [name]);
    
    const [[error]] = await Promise.all([
        once(cp, 'error'),
    ]);
    
    rimraf.sync(to);
    stopAll();
    
    t.ok(error, 'should be error: ' + error.message);
    t.end();
});

test('copy 1 file: from', async (t) => {
    const from = join(__dirname, '/../lib/');
    const to = temp();
    const name = basename(__filename);
    const cp = copymitter(from, to, [name]);
    
    const [[file], [progress]] = await Promise.all([
        once(cp, 'file'),
        once(cp, 'progress'),
        once(cp, 'end'),
    ]);
    
    const full = join(from, name);
    const dataFile = fs.readFileSync(file, 'utf8');
    const dataFull = fs.readFileSync(full, 'utf8');
    const statFile = fs.statSync(file);
    const statFull = fs.statSync(full);
    
    t.equal(dataFile, dataFull, 'files data should be equal');
    t.equal(statFile.mode, statFull.mode, 'fils mode should be equal');
    fs.unlinkSync(join(to, name));
    
    rimraf.sync(to);
    t.end();
});

test('copy 1 file: zip: emit file', async (t) => {
    const from = join(__dirname, 'fixture', 'hello.zip');
    const to = temp();
    const name = 'hello.txt';
    const cp = copymitter(from, to, [name]);
    
    const [result] = await once(cp, 'file');
    const expected = join(from, name);
    
    t.equal(result, expected, 'files data should be equal');
    t.end();
});

test('copy 1 file: from zip', async (t) => {
    const from = join(__dirname, 'fixture', 'hello.zip');
    const to = temp();
    const name = 'hello.txt';
    const cp = copymitter(from, to, [name]);
    
    await once(cp, 'end');
    
    const source = join(from, name);
    const dest = join(to, name);
    
    const streamSource = await read(source);
    const streamDest = await read(dest);
    
    const dataSource = await pullout(streamSource);
    const dataDest = await pullout(streamDest);
    
    await remove(join(to, name));
    
    t.equal(dataDest, dataSource, 'files data should be equal');
    t.end();
});

test('copy 1 file: to zip', async (t) => {
    const from = join(__dirname, 'fixture');
    const to = join(temp(), 'remove-me.zip');
    const name = 'hello.txt';
    
    await copyFile(join(from, 'hello.zip'), to);
    
    const cp = copymitter(from, to, [name]);
    
    await once(cp, 'end');
    
    const source = join(from, name);
    const dest = join(to, name);
    
    const streamSource = await read(source);
    const streamDest = await read(dest);
    
    const dataSource = await pullout(streamSource);
    const dataDest = await pullout(streamDest);
    
    await rm(to, {
        recursive: true,
        force: true,
    });
    
    t.equal(dataDest, dataSource, 'files data should be equal');
    t.end();
});

test('copy 1 file: mode', async (t) => {
    const from = join(__dirname, 'fixture');
    const to = temp();
    const name = 'hello.zip';
    const cp = copymitter(from, to, [name]);
    
    await once(cp, 'end');
    
    const source = join(from, name);
    const dest = join(to, name);
    
    const statSource = await readStat(source);
    const statDest = await readStat(dest);
    
    await remove(dest);
    
    t.equal(statDest.mode, statSource.mode, 'fils mode should be equal');
    t.end();
});

test('copy 1 file: from: symlink', async (t) => {
    const from = join(__dirname, 'fixture');
    const to = temp();
    const name = 'symlink';
    const cp = copymitter(from, to, [name]);
    
    await once(cp, 'end');
    
    const source = join(from, name);
    const dest = join(to, name);
    
    const streamSource = await read(source);
    const streamDest = await read(dest);
    
    const dataSource = await pullout(streamSource);
    const dataDest = await pullout(streamDest);
    
    await remove(join(to, name));
    
    t.equal(dataDest, dataSource, 'files data should be equal');
    t.end();
});

test('copy 1 file: from: symlink: mode', async (t) => {
    const from = join(__dirname, 'fixture');
    const to = temp();
    const name = 'symlink';
    const cp = copymitter(from, to, [name]);
    
    await once(cp, 'end');
    
    const source = join(from, name);
    const dest = join(to, name);
    
    const statSource = await readStat(source);
    const statDest = await readStat(dest);
    
    await rm(to, {
        recursive: true,
        force: true,
    });
    
    t.equal(statDest.mode, statSource.mode, 'files mode should be equal');
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
    
    await rm(to, {
        force: true,
        recursive: true,
    });
    
    t.ok(stat, 'should copy dir');
    t.end();
});

test('copy directories: error', async (t) => {
    const from = join(__dirname, 'fixture');
    const dir = join(__dirname, 'fixture', 'empty-directory');
    
    await mkdir(dir, {
        recursive: true,
    });
    const cp = copymitter(from, '/', [
        'empty-directory',
    ]);
    
    const [error] = await once(cp, 'error');
    
    t.ok(error, 'should emit error');
    t.end();
});

test('copy directories: emit: dest', async (t) => {
    const from = __dirname;
    const to = temp();
    const name = basename(__filename);
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
    const from = join(__dirname, '..');
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

test('copy empty file: from', async (t) => {
    const from = join(__dirname, 'fixture');
    const to = temp();
    const name = 'empty.txt';
    const cp = copymitter(from, to, [name]);
    
    const [[progress]] = await Promise.all([
        once(cp, 'progress'),
        once(cp, 'end'),
    ]);
    
    await rm(to, {
        recursive: true,
        force: true,
    });
    
    t.equal(progress, 100);
    t.end();
});

test('copy nested', async (t) => {
    const from = join(__dirname, 'fixture');
    const to = temp();
    const name = 'nested';
    const cp = copymitter(from, to, [name]);
    
    const [[progress]] = await Promise.all([
        once(cp, 'progress'),
        once(cp, 'end'),
    ]);
    
    await rm(to, {
        recursive: true,
        force: true,
    });
    
    t.equal(progress, 100);
    t.end();
});
