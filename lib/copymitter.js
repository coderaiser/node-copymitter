(function() {
    'use strict';
    
    var fs      = require('fs'),
        path    = require('path'),
        util    = require('util'),
        pipe    = require('pipe-io'),
        assert  = require('assert'),
        Emitter = require('events').EventEmitter;
        
    util.inherits(Copymitter, Emitter);
        
    module.exports = function(from, to, files) {
        var emitter;
        
        assert(typeof from === 'string', 'from should be string!');
        assert(typeof to === 'string', 'to should be string!');
        assert(Array.isArray(files), 'files should be array');
        
        emitter = new Copymitter(from, to, files);
        
        return emitter;
    };
    
    function Copymitter(from, to, files) {
        var self    = this,
            arr     = files.slice();
        
        self.i  = 0;
        self.n  = files.length;
        
        process.nextTick(function() {
            self.cpAll(from, to, arr);
        });
        
        self.on('continue', function() {
            self.cpAll(from, to, arr);
        });
        
        self.on('abort', function() {
            self.emitter.emit('end');
        });
    }
    
    Copymitter.prototype.cpAll = function(from, to, files) {
        var fromFull,
            toFull,
            cpEmitter,
            self    = this,
            name    = files.shift();
        
        if (!name) {
            self.emit('end');
        } else {
            fromFull    = self.normalize(from, name);
            toFull      = self.normalize(to, name);
            
            cpEmitter   = self.cpOneFile(fromFull, toFull);
            
            cpEmitter.on('error', function(error) {
                var progress = self.percent();
                
                self.emit('error', error, name, self.i, progress);
            });
            
            cpEmitter.on('end', function() {
                var progress = self.percent();
                
                self.emit('file', name, self.i, progress);
                self.cpAll(from, to, files);
            });
        }
    };
    
    Copymitter.prototype.cpOneFile = function(from, to) {
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
    };
    
    Copymitter.prototype.percent    = function() {
        var value;
        
        this.i++;
        
        value = Math.round(this.i * 100 / this.n);
        
        return value + '%';
    };
    
    Copymitter.prototype.normalize  = function(dir, name) {
        return path.normalize(dir + '/' + name);
    };
    
})();
