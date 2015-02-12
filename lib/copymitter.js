(function() {
    'use strict';
    
    var fs      = require('fs'),
        path    = require('path'),
        util    = require('util'),
        pipe    = require('pipe-io'),
        findit  = require('findit'),
        assert  = require('assert'),
        mkdirp  = require('mkdirp'),
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
            arr     = files.map(function(item) {
                return path.join(from, item);
            });
        
        this._files  = [];
        this._i      = 0;
        this._from   = from;
        this._to     = to;
        
        self._findFiles(arr, function() {
            self._n = self._files.length;
            self._cpAll();
        });
    }
    
    Copymitter.prototype.continue   = function() {
        this._cpAll();
    };
    
    Copymitter.prototype.abort   = function() {
        this._files = [];
        this.emit('end');
    };
    
    Copymitter.prototype._cpAll = function() {
        var self    = this,
            
            from    = this._from,
            to      = this._to,
            
            fromFull,
            toFull,
            cpEmitter,
            
            name    = this._files.shift();
        
        if (!name) {
            self.emit('end');
        } else {
            fromFull    = path.join(from, name);
            toFull      = path.join(to, name);
            
            cpEmitter   = self.cpOneFile(fromFull, toFull);
            
            cpEmitter.on('error', function(error) {
                var progress;
                
                if (error.code !== 'ENOENT') {
                    progress = self._percent();
                    self.emit('error', error, toFull, self._i, progress);
                } else {
                    mkdirp(path.dirname(toFull), function() {
                        self._files.unshift(name);
                        self._cpAll();
                    });
                }
            });
            
            cpEmitter.on('end', function() {
                var progress = self._percent();
                
                self.emit('file', toFull, self._i, progress);
                self._cpAll();
            });
        }
    };
    
    Copymitter.prototype._findFiles      = function(files, fn) {
        var self    = this,
            from    = this._from,
            finder  = findit(from),
            check   = function(name) {
                var is = files.some(function(file) {
                    var is = ~name.indexOf(file);
                    
                    return is;
                });
                
                return is;
            };
        
        finder.on('file', function(file) {
            var good    = check(file),
                name    = file.replace(from, '');
            
            if (good)
                self._files.push(name);
        });
        
        finder.on('end', function() {
            fn();
        });
    };
    
    Copymitter.prototype.cpOneFile  = function(from, to) {
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
    
    Copymitter.prototype._percent    = function() {
        var value;
        
        this._i++;
        
        value = Math.round(this._i * 100 / this._n);
        
        return value + '%';
    };
    
    Copymitter.prototype._normalize  = function(dir, name) {
        return path.normalize(dir + '/' + name);
    };
    
})();
