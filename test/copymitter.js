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
    
})();
