'use strict';

const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const test = require('tape');
const copymitter = require('..');

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

test('file: error EACESS: no fs.access', (t) => {
    const access = fs.access;
    
    fs.access = null;
    
    const cp = copymitter(__dirname, '/', [
        path.basename(__filename)
    ]);
    
    cp.on('error', (error) => {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        fs.access = access;
        t.end();
    });
});

test('file: error EACESS: no fs.access, read error', (t) => {
    const access = fs.access;
    
    fs.access = null;
    
    const cp = copymitter('/root', '/', [
        path.basename(__filename)
    ]);
    
    cp.on('error', (error) => {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        fs.access = access;
        t.end();
    });
});

test('folder: error EACESS', (t) => {
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

test('copy 1 file: to', (t) => {
    const from = path.join(__dirname, '/../bin/');
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

test('copy 1 file: to (error: EISDIR, not create dir)', (t) => {
    const mkdir = fs.mkdir;
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'bin';
    
    fs.mkdir =  (name, mode, cb) => cb();
    fs.mkdirSync(to);
    
    const cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('error', (error) => {
        t.ok(error, 'should be error');
    });
    
    cp.on('end', () => {
        fs.mkdir = mkdir;
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: to (error: EISDIR, stat error)', (t) => {
    const {stat} = fs;
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'bin';
    
    fs.mkdirSync(to);
    
    mkdirp.sync(to + '/bin/copymitter.js');
    
    const errorName = path.join(from, name, 'copymitter.js');
    
    let was;
    fs.stat = (name, fn) => {
        if (name === errorName) {
            if (was)
                return fn(Error('hello error'));
           
            was = true;
        }
        
        stat(name, fn);
    };
    
    const cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('error', (error) => {
        t.ok(error, 'should be error: ' + error.message);
        cp.abort();
    });
    
    cp.on('end', () => {
        fs.stat = stat;
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: to (error: ENOENT, create dir error)', (t) => {
    const mkdir = fs.mkdir;
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'bin';
    
    let was;
    fs.mkdir = (name, mode, cb) => {
        let error;
        
        if (!was)
            was = true;
        else
            error = Error('NOT EEXIST');
        
        cb(error);
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

test('copy 1 file: to (directory exist)', (t) => {
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'bin';
    
    mkdirp.sync(path.join(to, 'bin', 'copymitter.js'));
    
    const cp = copymitter(from, to, [
        name
    ]);
    
    cp.once('progress', (n) => {
        t.equal(n, 50, 'should equal');
    });
    
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
});
 
test('copy 1 file: to (directory exist, error mkdir)', (t) => {
    const mkdir = fs.mkdir;
    const from = path.join(__dirname, '..');
    const to = path.join('/tmp', String(Math.random()));
    const name = 'bin';
    
    let was;
    
    fs.mkdir =  (name, mode, cb) => {
        let error;
        
        if (!was)
            was = true;
        else
            error = Error('NOT EEXIST');
        
        cb(error);
    };
    
    mkdirp.sync(path.join(to, 'bin', 'copymitter.js'));
    
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
    const from = path.join(__dirname, '/../bin/');
    const to = '/tmp';
    const name = path.basename(__filename);
    
    const cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('file', (file) => {
        const full        = path.join(from, name),
        
            dataFile    = fs.readFileSync(file, 'utf8'),
            dataFull    = fs.readFileSync(full, 'utf8'),
            
            statFile    = fs.statSync(file),
            statFull    = fs.statSync(full);
        
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
    const name = 'bin';
    
    mkdirp.sync(to);
    
    const cp = copymitter(from, to, [
        name
    ]);
    
    cp.pause();
    cp.continue();
     
    cp.on('end', () => {
        rimraf.sync(to);
        t.end();
    });
});

test('cpOneFile: error: EPERM', (t) => {
    const from = __dirname;
    const to = '/tmp';
    const name = 'bin';
    
    const {stat, access} = fs;
    const error = Error('Operation not permitted');
    
    let once;
    
    fs.stat = (name, fn) => {
        if (once)
            return fn(error);
        
        once = true;
        stat(name, fn);
    };
    
    fs.access = (from, how, fn) => {
        fn();
    };
    
    const cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('error', (e) => {
        t.equal(e, error, 'should operation be not permitted');
        cp.continue();
    });
    
    cp.on('end', () => {
        fs.stat = stat;
        fs.access = access;
        t.end();
    });
});

test('cpOneFile: error: EPERM: no fs.access', (t) => {
    const from = __dirname;
    const to = '/tmp';
    const name = 'copymitter.js';
    
    const {stat, open, access} = fs;
    const error = Error('Operation not permitted');
    
    let count;
    
    fs.stat = (name, fn) => {
        if (count === 2)
            return fn(error);
        
        ++count;
        stat(name, fn);
    };
    
    fs.access = null;
    
    fs.open = (name, how, fn) => {
        fn(error);
    };
    
    const cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('error', (e) => {
        t.equal(e, error, 'should operation be not permitted');
        cp.continue();
    });
    
    cp.on('end', () => {
        fs.stat = stat;
        fs.open = open;
        fs.access = access;
        t.end();
    });
});

