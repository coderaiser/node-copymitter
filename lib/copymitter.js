(function() {
    'use strict';
    
    var fs      = require('fs'),
        path    = require('path'),
        util    = require('util'),
        pipe    = require('pipe-io'),
        findit  = require('findit'),
        assert  = require('assert'),
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
        this._pause = false;
        this._cpAll();
    };
    
    Copymitter.prototype.pause      = function() {
        this._pause = true;
    };
    
    Copymitter.prototype.abort   = function() {
        this._files = [];
        this._cpAll();
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
                var emitError = function(error) {
                    self.emit('error', error, toFull, self._i);
                };
                
                switch (error.code) {
                default:
                    self._progress();
                    emitError(error);
                    break;
                
                case 'ENOENT':
                    self._enoent(fromFull, toFull, emitError);
                    break;
                
                case 'EISDIR':
                    self._eisdir(fromFull, toFull, emitError);
                    break;
                }
            });
            
            cpEmitter.on('end', function() {
                self._progress();
                
                self.emit('file', toFull, self._i);
                
                if (!self._pause)
                    self._cpAll();
            });
        }
    };
    
    Copymitter.prototype._eisdir        = function(from, to, fn) {
        var self    = this,
            is      = function(error) {
                return self._is(error, fn);
            };
        
        fs.stat(from, function(error, stat) {
            if (!is(error))
                fs.mkdir(to, stat.mode, function(error) {
                    if (error && error.code !== 'EEXIST') {
                        fn(error);
                    } else {
                        self._progress();
                        self._cpAll();
                    }
                });
        });
    };
    
    Copymitter.prototype._enoent        = function(from, to, fn) {
        var self = this,
            is      = function(error) {
                return self._is(error, fn);
            };
        
        to = path.dirname(to);
        
        fs.stat(from, function(error, stat) {
            if (!is(error))
                fs.mkdir(to, stat.mode, function(error) {
                    var name;
                    
                    if (!is(error)) {
                        name = path.basename(to);
                        --self._i;
                        self._files.unshift(name);
                        self._cpAll();
                    }
                });
        });
    };
    
    Copymitter.prototype._is            = function(error, fn) {
        error && fn(error);
        return !!error;
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
        finder.on('link', onFind);
        
        finder.on('end', function() {
            fn();
        });
    };
    
    Copymitter.prototype.cpOneFile  = function(from, to) {
        var emitter     = new Emitter(),
            self        = this,
            cp          = function() {
                var read    = fs.createReadStream(from),
                    write   = fs.createWriteStream(to);
                
                pipe([read, write], function(error) {
                    if (error)
                        emitter.emit('error', error);
                    else
                        emitter.emit('end', from);
                });
            };
        
        fs.stat(from, function(error, stat) {
            if (!error && stat.isDirectory()) {
                fs.mkdir(to, stat.mode, function(error) {
                    if (error && error.code !== 'EEXIST')
                        emitter.emit('error', error);
                    else
                        emitter.emit('end', from);
                });
            } else {
                self._access(from, function(error) {
                    if (error)
                        emitter.emit('error', error);
                    else
                        cp();
                });
            }
        });
        
        return emitter;
    };
    
    Copymitter.prototype._access = function(from, cb) {
        if (fs.access)
            fs.access(from, fs.R_OK, cb);
        else
            fs.open(from, 'r', function(error, fd) {
                if (error)
                    cb(error);
                else
                    fs.close(fd, function(error) {
                        cb(error);
                    });
            });
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
})();
