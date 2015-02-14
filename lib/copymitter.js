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
        assert(Array.isArray(files), 'files should be array!');
        
        emitter = new Copymitter(from, to, files);
        
        return emitter;
    };
    
    function Copymitter(from, to, files) {
        var self        = this;
        
        this._files         = [];
        this._i             = 0;
        this._from          = from;
        this._to            = to;
        
        this._percent       = 0;
        this._percentPrev   = 0;
        
        this._parallel(from, files, function() {
            self._n = self._files.length;
            self._cpAll();
        });
    }
    
    Copymitter.prototype._parallel  = function(from, files, callback) {
        var self    = this,
            i       = files.length,
            fn      = function() {
                if (!--i)
                    callback();
            };
        
        files.forEach(function(name) {
            var full = path.join(from, name);
            
            self._findFiles(full, fn);
        });
    };
    
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
        
        ++this._i;
        
        if (!name) {
            self.emit('end');
        } else {
            fromFull    = path.join(from, name);
            toFull      = path.join(to, name);
            
            cpEmitter   = self.cpOneFile(fromFull, toFull);
            
            cpEmitter.on('error', function(error) {
                var reg     = /^E(NOENT|ISDIR)$/,
                    isError = reg.test(error.code);
                
                if (isError) {
                    if (error.code === 'ENOENT')
                        mkdirp(path.dirname(toFull), function() {
                            --self._i;
                            self._files.unshift(name);
                            self._cpAll();
                        });
                    else if (error.code === 'EISDIR')
                        fs.unlink(toFull, function() {
                           mkdirp(toFull, function() {
                                self._progress();
                                self._cpAll();
                            });
                        });
                } else {
                    self._progress();
                    self.emit('error', error, toFull, self._i, self._n);
                }
            });
            
            cpEmitter.on('end', function() {
                self._progress();
                
                self.emit('file', toFull, self._i, self._n);
                self._cpAll();
            });
        }
    };
    
    Copymitter.prototype._findFiles     = function(filename, fn) {
        var self        = this,
            from        = this._from,
            finder      = findit(filename),
            onFind      = function(name) {
                if (typeof name !== 'string')
                    name    = name.path;
                    
                name    = name.replace(from, '');
                
                self._files.push(name);
            };
        
        finder.on('file', onFind);
        finder.on('error', onFind);
        finder.on('directory', onFind);
        
        finder.on('end', function() {
            fn();
        });
    };
    
    Copymitter.prototype.cpOneFile  = function(from, to) {
        var was,
            emitter     = new Emitter(),
            read        = fs.createReadStream(from),
            write       = fs.createWriteStream(to);
        
        pipe([read, write], function(error) {
            if (!was) {
                was = true;
                
                if (error)
                    emitter.emit('error', error);
                else
                    emitter.emit('end', from);
            }
        });
        
        return emitter;
    };
    
    Copymitter.prototype._progress    = function() {
        var value;
        
        value = Math.round(this._i * 100 / this._n);
        
        this._percent = value;
        
        if (value !== this._percentPrev) {
            this._percentPrev = value;
            this.emit('progress', value);
        }
    };
    
    Copymitter.prototype._normalize  = function(dir, name) {
        return path.normalize(dir + '/' + name);
    };
    
})();
