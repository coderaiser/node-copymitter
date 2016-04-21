'use strict';

var path        = require('path'),
    fs          = require('fs'),
    rimraf      = require('rimraf'),
    mkdirp      = require('mkdirp'),
    test        = require('tape'),
    copymitter  = require('..');

test('file: error EACESS', function(t) {
    var cp = copymitter(__dirname, '/', [
        path.basename(__filename)
    ]);
    
    cp.on('error', function(error) {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', function() {
        t.end();
    });
});

test('file: error EACESS: no fs.access', function(t) {
    var access = fs.access;
    
    fs.access = null;
    
    var cp = copymitter(__dirname, '/', [
        path.basename(__filename)
    ]);
    
    cp.on('error', function(error) {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', function() {
        fs.access = access;
        t.end();
    });
});

test('file: error EACESS: no fs.access, read error', function(t) {
    var access = fs.access;
    
    fs.access = null;
    
    var cp = copymitter('/root', '/', [
        path.basename(__filename)
    ]);
    
    cp.on('error', function(error) {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', function() {
        fs.access = access;
        t.end();
    });
});

test('folder: error EACESS', function(t) {
    var from    = path.join(__dirname, '..'),
        name    = path.basename(__dirname);
    
    var cp = copymitter(from, '/', [
        name
    ]);
    
    cp.on('error', function(error) {
        t.equal(error.code, 'EACCES', error.message);
        cp.abort();
    });
    
    cp.on('end', function() {
        t.end();
    });
});

test('copy 1 file: to', function(t) {
    var from    = path.join(__dirname, '/../bin/'),
        to      = '/tmp',
        name    = path.basename(__filename);
    
    var cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('file', function(file) {
        var full = path.join(to, name);
        
        t.equal(file, full, 'file paths should be equal');
    });
    
    cp.on('progress', function(progress) {
        t.equal(progress, 100, 'progress');
    });
    
    cp.on('end', function() {
        t.end();
    });
});

test('copy 1 file: to (error: EISDIR, not create dir)', function(t) {
    var mkdir   = fs.mkdir,
        from    = path.join(__dirname, '..'),
        to      = path.join('/tmp', String(Math.random())),
        name    = 'bin';
    
    fs.mkdir =  function(name, mode, cb) {
        cb();
    };
    
    fs.mkdirSync(to);
    
    var cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('error', function(error) {
        t.ok(error, 'should be error');
    });
    
    cp.on('end', function() {
        fs.mkdir = mkdir;
        rimraf.sync(to);
        t.end();
    });
});
/*
test('copy 1 file: to (error: EISDIR, create dir error)', function(t) {
    var was,
        mkdir   = fs.mkdir,
        from    = path.join(__dirname, '..'),
        to      = path.join('/tmp', String(Math.random())),
        name    = 'bin';
    
    fs.mkdir =  function(name, mode, cb) {
        var error;
        
        if (!was)
            was = true;
        else
            error = Error('NOT EEXIST');
        
        cb(error);
    };
    
    fs.mkdirSync(to);
    
    var cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('error', function(error) {
        t.ok(error, 'should be error: ' + error.message);
        cp.abort();
    });
    
    cp.on('end', function() {
        fs.mkdir = mkdir;
        rimraf.sync(to);
        t.end();
    });
});
*/
test('copy 1 file: to (directory exist)', function(t) {
    var from    = path.join(__dirname, '..'),
        to      = path.join('/tmp', String(Math.random())),
        name    = 'bin';
    
    mkdirp.sync(path.join(to, 'bin', 'copymitter.js'));
    
    var cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('end', function() {
        rimraf.sync(to);
        t.end();
    });
});
 
 test('copy 1 file: to (directory exist, error mkdir)', function(t) {
    var was,
        mkdir   = fs.mkdir,
        from    = path.join(__dirname, '..'),
        to      = path.join('/tmp', String(Math.random())),
        name    = 'bin';
    
    fs.mkdir =  function(name, mode, cb) {
        var error;
        
        if (!was)
            was = true;
        else
            error = Error('NOT EEXIST');
        
        cb(error);
    };
    
    mkdirp.sync(path.join(to, 'bin', 'copymitter.js'));
    
    var cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('error', function(error) {
        t.ok(error, 'should be error: ' + error.message);
        cp.abort();
    });
    cp.on('end', function() {
        fs.mkdir = mkdir;
        rimraf.sync(to);
        t.end();
    });
});

test('copy 1 file: from', function(t) {
    var from    = path.join(__dirname, '/../bin/'),
        to      = '/tmp',
        name    = path.basename(__filename);
    
    var cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('file', function(file) {
        var full        = path.join(from, name),
        
            dataFile    = fs.readFileSync(file, 'utf8'),
            dataFull    = fs.readFileSync(full, 'utf8'),
            
            statFile    = fs.statSync(file),
            statFull    = fs.statSync(full);
        
        t.equal(dataFile, dataFull, 'files data should be equal');
        t.equal(statFile.mode, statFull.mode, 'fils mode should be equal');
    });
    
    cp.on('progress', function(progress) {
        t.equal(progress, 100, 'progress');
    });
    
    cp.on('end', function() {
        t.end();
    });
});

test('copy 1 directory', function(t) {
    var files   = [],
        array   = [],
        from    = path.join(__dirname, '..'),
        to      = '/tmp',
        name    = path.basename(__dirname),
        FILES   = ['/tmp/test', path.join('/tmp/test', path.basename(__filename))];
    
    var cp = copymitter(from, to, [
        name
    ]);
    
    cp.on('file', function(file) {
        files.push(file);
    });
    
    cp.on('progress', function(progress) {
        array.push(progress);
    });
    
    cp.on('end', function() {
        t.deepEqual(files, FILES, 'progress');
        t.deepEqual(array, [50, 100], 'progress');
        t.end();
    });
});

test('file: error ENOENT', function(t) {
    var from    = '/',
        to      = '/tmp';
    
    var cp = copymitter(from, to, [
        Math.random()
            .toString()
    ]);
    
    cp.on('error', function(error) {
        t.equal(error.code, 'ENOENT', error.message);
        cp.abort();
    });
    
    cp.on('end', function() {
        t.end();
    });
});

test('pause/continue', function(t) {
    var from    = path.join(__dirname, '..'),
        to      = path.join('/tmp', String(Math.random())),
        name    = 'bin';
    
    mkdirp.sync(to);
    
    var cp = copymitter(from, to, [
        name
    ]);
    
    cp.pause();
    cp.continue();
     
    cp.on('end', function() {
        rimraf.sync(to);
        t.end();
    });
});

