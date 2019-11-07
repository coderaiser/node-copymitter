'use strict';

const fs = require('fs');
const path = require('path');
const {tmpdir} = require('os');

const {join, basename} = path;

const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const test = require('supertape');
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
    const fn = () => copymitter('/hello', '/world');
    t.throws(fn, /files should be an array!/, 'should throw when no args');
    t.end();
});

test('file: error EACESS', (t) => {
    const cp = copymitter(__dirname, '/', [
        path.basename(__filename),
    ]);
    
    cp.on('error', (error) => {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        t.end();
    });
});

test('directory: error EACESS', (t) => {
    const from = path.join(__dirname, '..');
    const name = path.basename(__dirname);
    
    const cp = copymitter(from, '/', [
        name,
    ]);
    
    cp.on('error', (error) => {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        t.end();
    });
});

test('copy 1 file: to: src', (t) => {
    const from = path.join(__dirname, '/../lib/');
    const to = temp();
    const name = path.basename(__filename);
    
    const cp = copymitter(from, to, [
        name,
    ]);
    
    cp.on('file', (src) => {
        const fromFull = path.join(from, name);
        const toFull = path.join(to, name);
        
        t.equal(src, fromFull, 'file paths should be equal');
        fs.unlinkSync(toFull);
    });
    
    cp.on('progress', (progress) => {
        t.equal(progress, 100, 'progress');
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: to: dest', (t) => {
    const from = path.join(__dirname, '/../lib/');
    const to = temp();
    const name = path.basename(__filename);
    
    const cp = copymitter(from, to, [
        name,
    ]);
    
    cp.on('file', (src, dest) => {
        const full = path.join(to, name);
        
        t.equal(dest, full, 'file paths should be equal');
        fs.unlinkSync(full);
    });
    
    cp.on('progress', (progress) => {
        t.equal(progress, 100, 'progress');
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: to (error: ENOENT, create dir error)', (t) => {
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
    
    const cp = copymitter(from, to, [
        name,
    ]);
    
    cp.on('error', (error) => {
        t.ok(error, 'should be error: ' + error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        fs.mkdir = mkdir;
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: to (directory exist)', (t) => {
    const from = path.join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    
    mkdirp.sync(path.join(to, 'lib', 'copymitter.js'));
    
    const cp = copymitter(from, to, [
        name,
    ]);
    
    cp.on('progress', (n) => {
        if (n === 100)
            t.pass('should equal');
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: to (directory exist, error mkdir)', (t) => {
    const {mkdir} = fs;
    const from = path.join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    
    let was;
    
    stub('mkdirp', (name, mode, cb) => {
        let error;
        
        if (!was)
            was = true;
        else
            error = Error('NOT EEXIST');
        
        cb(error);
    });
    
    const copymitter = rerequire('..');
    
    mkdirp.sync(path.join(to, 'lib', 'copymitter.js'));
    
    const cp = copymitter(from, to, [
        name,
    ]);
    
    cp.on('error', (error) => {
        t.ok(error, 'should be error: ' + error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        fs.mkdir = mkdir;
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: from', (t) => {
    const from = path.join(__dirname, '/../lib/');
    const to = temp();
    const name = path.basename(__filename);
    
    const cp = copymitter(from, to, [
        name,
    ]);
    
    cp.on('file', (file) => {
        const full = path.join(from, name);
        
        const dataFile = fs.readFileSync(file, 'utf8');
        const dataFull = fs.readFileSync(full, 'utf8');
        const statFile = fs.statSync(file);
        const statFull = fs.statSync(full);
        
        t.equal(dataFile, dataFull, 'files data should be equal');
        t.equal(statFile.mode, statFull.mode, 'fils mode should be equal');
        fs.unlinkSync(path.join(to, name));
    });
    
    cp.on('progress', (progress) => {
        t.equal(progress, 100, 'progress');
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: from: symlink', (t) => {
    const from = path.join(__dirname, 'fixture');
    const to = temp();
    
    const name = 'symlink';
    
    const cp = copymitter(from, to, [
        name,
    ]);
    
    cp.on('file', (file) => {
        const full = path.join(from, name);
        
        const dataFile = fs.readFileSync(file, 'utf8');
        const dataFull = fs.readFileSync(full, 'utf8');
        const statFile = fs.statSync(file);
        const statFull = fs.statSync(full);
        
        t.equal(dataFile, dataFull, 'files data should be equal');
        t.equal(statFile.mode, statFull.mode, 'fils mode should be equal');
        fs.unlinkSync(path.join(to, name));
    });
    
    cp.on('progress', (progress) => {
        t.equal(progress, 100, 'progress');
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
});

test('copy directories: exist', (t) => {
    const to = temp();
    const from = join(__dirname);
    const name = basename(__filename);
    const names = [
        name,
    ];
    
    const cp = copymitter(from, to, names);
    
    cp.on('end', () => {
        const dir = join(to, name);
        const stat = fs.statSync(dir);
        
        rimraf.sync(to);
        
        t.ok(stat, 'should copy dir');
        t.end();
    });
});

test('copy directories: emit: src', (t) => {
    const from = __dirname;
    const to = temp();
    const name = path.basename(__filename);
    const names = [
        name,
    ];
    
    const cp = copymitter(from, to, names);
    
    cp.once('directory', (src) => {
        t.ok(src, 'should emit directory name');
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });

});

test('copy directories: emit: dest', (t) => {
    const from = path.join(__dirname, '..', 'node_modules');
    const to = temp();
    const name = 'tape';
    const names = [
        name,
    ];
    
    const cp = copymitter(from, to, names);
    
    cp.once('directory', (src, dest) => {
        t.ok(dest, 'should emit "dest"');
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });

});

test('file: error ENOENT', (t) => {
    const from = '/';
    const to = temp();
    
    const cp = copymitter(from, to, [
        Math.random()
            .toString(),
    ]);
    
    cp.on('error', (error) => {
        t.equal(error.code, 'ENOENT', error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
});

test('pause/continue', (t) => {
    const from = path.join(__dirname, '..');
    const to = temp();
    const name = 'lib';
    
    mkdirp.sync(to);
    
    const cp = copymitter(from, to, [
        name,
    ]);
    
    cp.on('pause', () => {
        t.pass('should emit pause');
        cp.continue();
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
    
    cp.pause();
});

function stub(name, fn) {
    require.cache[require.resolve(name)].exports = fn;
}

function rerequire(name) {
    delete require.cache[require.resolve(name)];
    return require(name);
}

