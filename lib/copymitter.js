'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const findit = require('findit');
const log = require('debug')('copymitter');
const EventEmitter = require('events').EventEmitter;
const copyFile = require('@cloudcmd/copy-file');
const through2 = require('through2');

const currify = require('currify/legacy');
const squad = require('squad/legacy');
const zames = require('zames/legacy');
const promisify = require('es6-promisify').promisify;
const stat = promisify(fs.stat);

util.inherits(Copymitter, EventEmitter);

module.exports = (from, to, files) => {
    check(from, to, files);
    
    return Copymitter(from, to, files);
};

const callIfError = currify((fn, error) => {
    error && fn(error);
    return Boolean(error);
});

const getErrorEmitter = (a) => a.emit.bind(a, 'error');
const emitIfError = squad(callIfError, getErrorEmitter);

const removeStr = currify((a, b) => b.replace(a, ''));
const pushValue = currify((array, value) => array.push(value));


function Copymitter(from, to, files) {
    if (!(this instanceof Copymitter))
        return new Copymitter(from, to, files);
    
    EventEmitter.call(this);
    
    this._files = [];
    this._size = 0;
    this._i = 0;
    this._from = from;
    this._to = to;
    
    this._percent = 0;
    this._percentPrev = 0;
    
    this._parallel(from, files, () => {
        this._n = this._size;
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
            return emitError(error);
        
        case 'ENOENT':
            return this._enoent(fromFull, toFull, emitError);
        
        case 'EISDIR':
            ++this._i;
            return this._eisdir(fromFull, toFull, emitError);
        }
    });
    
    cpEmitter.on('end', () => {
        this._progress();
        
        this.emit('file', toFull, this._i);
        
        if (this._pause)
            return this.emit('pause');
        
        this._cpAll();
    });
};

Copymitter.prototype._eisdir = function(from, to, fn) {
    const is = callIfError(fn);
    
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
    const is = callIfError(fn);
    
    log(`enoent ${from}, ${to}`);
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

const getMode = (stat) => stat.mode;

function copyDir(from, to, fn) {
    stat(from)
        .then(getMode)
        .then(mkdir(to))
        .then(fn)
        .catch(fn);
}

const mkdir = zames((name, mode, fn) => {
    fs.mkdir(name, mode, (e) => {
        if (e && e.code !== 'EEXIST')
            return fn(e);
         
        fn();
    });
});

Copymitter.prototype._findFiles = function(filename, fn) {
    const removeFrom = removeStr(this._from);
    const push = pushValue(this._files);
    const addSize = (size) => this._size += size;
    
    const addName = squad(push, removeFrom);
    
    const onFindFile = (name, stat) => {
        addName(name);
        addSize(stat.size);
    };
    
    const onFindDir = (name) => {
        addName(name);
        addSize(1);
    };
    
    const onError = (e) => {
        addName(e.path);
        addSize(1);
    };
    
    findit(filename)
        .on('file', onFindFile)
        .on('directory', onFindDir)
        .on('link', onFindFile)
        .on('error', onError)
        .on('end', fn);
};

Copymitter.prototype.cpOneFile = function(from, to) {
    const emitter = new EventEmitter();
    const is = emitIfError(emitter);
    
    const countStream = through2((chunk, encoding, cb) => {
        this._i += chunk.length;
        this._progress();
        
        cb(null, chunk);
    });
    
    const cp = () => {
        log(`cpOneFile cp: ${from} -> ${to}`);
        copyFile(from, to, [countStream], (error) => {
            if (is(error))
                return;
            
            emitter.emit('end', from);
        });
    };
    
    fs.stat(from, (error, stat) => {
        if (is(error))
            return;
        
        if (!stat.isDirectory())
            return cp();
        
        copyDir(from, to, (e) => {
            if (e)
                return emitter.emit('error', e);
            
            emitter.emit('end', from);
        });
    });
    
    return emitter;
};

Copymitter.prototype._progress = function() {
    const value = Math.round(this._i * 100 / this._n);
    
    this._percent = value;
    
    if (value !== this._percentPrev) {
        this._percentPrev = value;
        this.emit('progress', value);
    }
};

function check(from, to, files) {
    if (typeof from !== 'string')
        throw Error('from should be a string!');
    
    if (typeof to !== 'string')
        throw Error('to should be a string!');
    
    if (!Array.isArray(files))
        throw Error('files should be an array!');
}

