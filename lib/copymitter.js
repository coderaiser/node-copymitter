(function() {
    'use strict';
    
    var fs      = require('fs'),
        path    = require('path'),
        pipe    = require('pipe-io'),
        assert  = require('assert'),
        Emitter = require('events').EventEmitter;
        
    module.exports = function(from, to, files) {
        var arr     = [],
            emitter = new Emitter();
        
        assert(from, 'from could not be empty!');
        assert(to, 'to could not be empty!');
        assert(files, 'files could not be empty!');
        
        arr = files.slice(),
        
        process.nextTick(function() {
            cpAll(emitter, from, to, arr);
        });
        
        emitter.on('continue', function() {
            cpAll(emitter, from, to, arr);
        });
        
        emitter.on('abort', function() {
            emitter.emit('end');
        });
        
        return emitter;
    };
    
    function cpAll(emitter, from, to, files) {
        var fromFull,
            toFull,
            cpEmitter,
            name    = files.shift();
        
        if (!name) {
            emitter.emit('end');
        } else {
            fromFull    = normalize(from, name);
            toFull      = normalize(to, name);
            
            cpEmitter   = cpOneFile(fromFull, toFull);
            
            cpEmitter.on('error', function(error) {
                emitter.emit('error', error, name);
            });
            
            cpEmitter.on('end', function() {
                emitter.emit('file', name);
                cpAll(emitter, from, to, files);
            });
        }
    }
    
    function cpOneFile(from, to) {
        var emitter     = new Emitter(),
            read        = fs.createReadStream(from),
            write       = fs.createWriteStream(to);
        
        pipe([read, write], function(error) {
            if (error)
                emitter.emit('error', error);
            else
                emitter.emit('end', from);
        });
        
        return emitter;
    }
    
    function normalize(dir, name) {
        return path.normalize(dir + '/' + name);
    }
    
})();
