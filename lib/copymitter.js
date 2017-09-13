'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const pipe = require('pipe-io/legacy');
const findit = require('findit');
const log = require('debug')('copymitter');
const assert = require('assert');
const Emitter = require('events').EventEmitter;

util.inherits(Copymitter, Emitter);

module.exports = (from, to, files) => {
    assert(typeof from === 'string', 'from should be string!');
    assert(typeof to === 'string', 'to should be string!');
    assert(Array.isArray(files), 'files should be array!');
    
    const emitter = new Copymitter(from, to, files);
    
    return emitter;
};

function Copymitter(from, to, files) {
    this._files         = [];
    this._i             = 0;
    this._from          = from;
    this._to            = to;
    
    this._percent       = 0;
    this._percentPrev   = 0;
    
    this._parallel(from, files, () => {
        this._n = this._files.length;
        this._cpAll();
    });
}

Copymitter.prototype._parallel = function(from, files, callback) {
    let i = files.length;
    const fn = () => {
        if (!--i)
            callback();
    };
    
    files.forEach((name) => {
        const full = path.join(from, name);
        
        this._findFiles(full, fn);
    });
};

Copymitter.prototype.continue = function() {
    this._pause = false;
    this._cpAll();
};

Copymitter.prototype.pause = function() {
    this._pause = true;
};

Copymitter.prototype.abort = function() {
    this._files = [];
    this._cpAll();
};

Copymitter.prototype._cpAll = function() {
    const from = this._from;
    const to = this._to;
    const name = this._files.shift();
    
    ++this._i;
    
    if (!name)
        return this.emit('end');
    
    const fromFull = path.join(from, name);
    const toFull = path.join(to, name);
    const cpEmitter = this.cpOneFile(fromFull, toFull);
    
    cpEmitter.on('error', (error) => {
        const emitError = (error) => {
            this.emit('error', error, toFull, this._i);
        };
        
        log('cpEmitter error: ' + error);
        
        switch (error.code) {
        default:
            this._progress();
            emitError(error);
            break;
        
        case 'ENOENT':
            this._enoent(fromFull, toFull, emitError);
            break;
        
        case 'EISDIR':
            this._eisdir(fromFull, toFull, emitError);
            break;
        }
    });
    
    cpEmitter.on('end', () => {
        this._progress();
        
        this.emit('file', toFull, this._i);
        
        if (!this._pause)
            this._cpAll();
    });
};

Copymitter.prototype._eisdir = function(from, to, fn) {
    const is = (error) => this._is(error, fn);
    
    log('eisdir');
    
    fs.stat(from, (error, stat) => {
        log('eisdir stat from');
        
        if (is(error))
            return;
        
        fs.mkdir(to, stat.mode, (error) => {
            log('eisdir mkdir to, error: ' + error);
            
            if (error && error.code !== 'EEXIST')
                return fn(error);
            
            this._progress();
            this._cpAll();
        });
    });
};

Copymitter.prototype._enoent = function(from, to, fn) {
    const is = (error) => {
        return this._is(error, fn);
    };
    
    log('enoent ' + from + ', ' + to);
    to = path.dirname(to);
    
    fs.stat(from, (error, stat) => {
        log('enoent stat from: ' + from);
        
        if (is(error))
            return;
        
        fs.mkdir(to, stat.mode, (error) => {
            log('enoent mkdir to: ' + to);
            
            if (is(error))
                return;
            
            log('enoent mkdir: no error');
            const name = path.basename(to);
            
            --this._i;
            this._files.unshift(name);
            this._cpAll();
        });
    });
};

Copymitter.prototype._is = (error, fn) => {
    error && fn(error);
    return !!error;
};

Copymitter.prototype._findFiles = function(filename, fn) {
    const from = this._from;
    const finder = findit(filename);
    const onFind = (name) => {
        if (typeof name !== 'string')
            name    = name.path;
            
        name    = name.replace(from, '');
        
        this._files.push(name);
    };
    
    finder.on('file', onFind);
    finder.on('error', onFind);
    finder.on('directory', onFind);
    finder.on('link', onFind);
    
    finder.on('end', fn);
};

Copymitter.prototype.cpOneFile  = function(from, to) {
    const emitter = new Emitter();
    const is = (error) => {
        return this._is(error, function(error) {
            emitter.emit('error', error);
        });
    };
    
    const cp = (mode) => {
        const read = fs.createReadStream(from);
        const write = fs.createWriteStream(to, {
            mode
        });
        
        log('cpOneFile cp: ' + from + ' -> ' + to);
        
        pipe([read, write], (error) => {
            if (is(error))
                return;
            
            emitter.emit('end', from);
        });
    };
    
    fs.stat(from, (error, stat) => {
        if (is(error))
            return;
        
        if (error || !stat.isDirectory())
            return this._access(from, (error) => {
                if (!is(error))
                    cp(stat.mode);
            });
        
        fs.mkdir(to, stat.mode, (error) => {
            log('cpOneFile mkdir:  ' + to + ' ' + error);
            if (error && error.code !== 'EEXIST')
                return emitter.emit('error', error);
            
            emitter.emit('end', from);
        });
    });
    
    return emitter;
};

Copymitter.prototype._access = (from, cb) => {
    if (fs.access)
        return fs.access(from, fs.R_OK, cb);
    
    fs.open(from, 'r', (error, fd) => {
        if (error)
            return cb(error);
        
        fs.close(fd, cb);
    });
};

Copymitter.prototype._progress = function() {
    const value = Math.round(this._i * 100 / this._n);
    
    this._percent = value;
    
    if (value !== this._percentPrev) {
        this._percentPrev = value;
        this.emit('progress', value);
    }
};

