(function() {
    'use strict';
    
    var path        = require('path'),
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
    
    test('copy 1 file', function(t) {
        var from    = __dirname,
            to      = '/tmp',
            name    = path.basename(__filename);
        
        var cp = copymitter(from, to, [
            name
        ]);
        
        cp.on('file', function(file) {
            var full = path.join(to, name);
            t.equal(file, full, 'file path');
        });
        
        cp.on('progress', function(progress) {
            t.equal(progress, 100, 'progress');
        });
        
        cp.on('end', function() {
            t.end();
        });
    });
    
})();
