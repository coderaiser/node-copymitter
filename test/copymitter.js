'use strict';

const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const test = require('tape');
const copymitter = require('..');

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
        path.basename(__filename)
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
        name
    ]);
    
    cp.on('error', (error) => {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        t.end();
    });
});

test('copymitter 1 file: to', (t) => {
    const from = path.join(__dirname, '/../lib/');
    const to = '/tmp';
    const name = path.basename(__filename);
    
    const cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('file', (file) => {
        const full = path.join(to, name);
        
        t.equal(file, full, 'file paths should be equal');
        fs.unlinkSync(full);
    });
    
    cp.on('progress', (progress) => {
        t.equal(progress, 100, 'progress');
    });
    
    cp.on('end', () => {
        t.end();
    });
});

test('copymitter 1 file: to (error: ENOENT, create dir error)', (t) => {
    const mkdir = fs.mkdir;
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'lib';
    
    let was;
    fs.mkdir = (name, mode, cb) => {
        if (was)
            return cb(Error('NOT EEXIST'));
        
        was = true;
        
        cb();
    };
    
    fs.mkdirSync(to);
    
    const cp = copymitter(from, to, [
        name
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

test('copymitter 1 file: to (directory exist)', (t) => {
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'lib';
    
    mkdirp.sync(path.join(to, 'lib', 'copymitter.js'));
    
    const cp = copymitter(from, to, [
        name
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
 
test('copymitter 1 file: to (directory exist, error mkdir)', (t) => {
    const mkdir = fs.mkdir;
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'lib';
    
    let was;
    
    fs.mkdir =  (name, mode, cb) => {
        let error;
        
        if (!was)
            was = true;
        else
            error = Error('NOT EEXIST');
        
        cb(error);
    };
    
    mkdirp.sync(path.join(to, 'lib', 'copymitter.js'));
    
    const cp = copymitter(from, to, [
        name
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
    const to = '/tmp';
    const name = path.basename(__filename);
    
    const cp = copymitter(from, to, [
        name
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
        t.end();
    });
});

test('copy directories', (t) => {
    const from = path.join(__dirname, '..', 'node_modules');
    const to = '/tmp';
    const names = [
        'tape',
        'rimraf',
    ];
    
    const cp = copymitter(from, to, names);
    
    cp.on('end', () => {
        const dir = path.join(to, names[0]);
        const stat = fs.statSync(dir);
        
        t.ok(stat, 'should copy dir');
        
        rimraf.sync(names[0]);
        rimraf.sync(names[1]);
        
        t.end();
    });
});

test('file: error ENOENT', (t) => {
    const from = '/';
    const to = '/tmp';
    
    const cp = copymitter(from, to, [
        Math.random()
            .toString()
    ]);
    
    cp.on('error', (error) => {
        t.equal(error.code, 'ENOENT', error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        t.end();
    });
});

test('pause/continue', (t) => {
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'lib';
    
    mkdirp.sync(to);
    
    const cp = copymitter(from, to, [
        name
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

