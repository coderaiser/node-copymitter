(function() {
    'use strict';
    
    var path        = require('path'),
        fs          = require('fs'),
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
    
    test('folder: error', function(t) {
        var from    = path.join(__dirname, '..'),
            name    = path.basename(__dirname);
        
        var cp = copymitter(from, '/', [
            name
        ]);
        
        cp.on('error', function(e) {
            t.ok(e, e && e.message);
            cp.abort();
        });
        
        cp.on('end', function() {
            t.end();
        });
    });
    
    test('copy 1 file', function(t) {
        var from    = __dirname,
            to      = '/tmp',
            name    = path.basename(__filename);
        
        var cp = copymitter(from, to, [
            name
        ]);
        
        cp.on('file', function(file) {
            var full        = path.join(to, name),
            
                dataFile    = fs.readFileSync(file, 'utf8'),
                dataFull    = fs.readFileSync(full, 'utf8'),
                
                statFile    = fs.statSync(file),
                statFull    = fs.statSync(full);
            
            t.equal(file, full, 'file path');
            t.equal(dataFile, dataFull, 'files data');
            
            t.deepEqual(statFile, statFull, 'file stats');
        });
        
        cp.on('progress', function(progress) {
            t.equal(progress, 100, 'progress');
        });
        
        cp.on('end', function() {
            t.end();
        });
    });
    
    test('copy 1 directory', function(t) {
        var array   = [],
            from    = path.join(__dirname, '..'),
            to      = '/tmp',
            name    = path.basename(__dirname);
        
        var cp = copymitter(from, to, [
            name
        ]);
        
        cp.on('file', function(file) {
            var nameFile    = path.basename(__filename),
                full        = path.join(to, name, nameFile);
            
            t.equal(file, full, 'file path');
        });
        
        cp.on('progress', function(progress) {
            array.push(progress);
        });
        
        cp.on('end', function() {
            t.deepEqual(array, [50, 100], 'progress');
            t.end();
        });
    });
    
})();
