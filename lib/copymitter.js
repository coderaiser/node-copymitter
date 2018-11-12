'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const {EventEmitter} = require('events');

const findit = require('findit2');
const log = require('debug')('copymitter');
const through2 = require('through2');
const mkdirp = require('mkdirp');

const wraptile = require('wraptile');
const currify = require('currify');
const squad = require('squad');
const zames = require('zames');
const {promisify} = require('util');

const copyFile = wraptile(require('@cloudcmd/copy-file'));

const stat = promisify(fs.stat);
const dirname = path.dirname;

util.inherits(Copymitter, EventEmitter);

module.exports = (from, to, files) => {
    check(from, to, files);
    
    return Copymitter(from, to, files);
};

const removeStr = currify((a, b) => b.replace(a, ''));
const pushValue = currify((array, value) => array.push(value));
const cleanReturn = () => {};

const getMode = (stat) => stat.mode;

const mkdir = zames((name, mode, fn) => {
    mkdirp(name, mode, (e) => {
        if (e && e.code !== 'EEXIST')
            return fn(e);
         
        fn();
    });
});

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
    const name = this._files.pop();
    
    if (!name)
        return this.emit('end');
    
    const fromFull = path.join(from, name);
    const toFull = path.join(to, name);
    const cpEmitter = this.cpOneFile(fromFull, toFull);
    
    cpEmitter.on('error', (error) => {
        log('cpEmitter error: ' + error);
        this.emit('error', error);
        this._i += 0.01;
    });
    
    cpEmitter.on('end', () => {
        this._progress();
        
        if (this._pause)
            return this.emit('pause');
        
        this._cpAll();
    });
};

const copyDir = (from, to) => {
    return stat(from)
        .then(getMode)
        .then(mkdir(to))
        .then(cleanReturn);
};

Copymitter.prototype._findFiles = function(filename, fn) {
    const removeFrom = removeStr(this._from);
    const push = pushValue(this._files);
    const addSize = (size) => this._size += size;
    const addName = squad(push, removeFrom);
    
    const onFindFile = (name, stat) => {
        addName(name);
        addSize(stat.size);
    };
    
    const onFindLink = (name) => {
        addName(name);
        addSize(1);
    };
    
    const onFindDir = (name) => {
        addName(name);
    };
    
    const onError = (e) => {
        addName(e.path);
    };
    
    findit(filename)
        .on('file', onFindFile)
        .on('directory', onFindDir)
        .on('link', onFindLink)
        .on('error', onError)
        .on('end', fn);
};

Copymitter.prototype.cpOneFile = function(from, to) {
    const {_i} = this;
    const emitter = new EventEmitter();
    const emitFile = () => {
        if (_i === this._i)
            ++this._i;
        
        this.emit('file', from, to);
        emitEnd();
    };
    const emitDirectory = () => {
        this.emit('directory', from, to);
        emitEnd();
    };
    const emitEnd = () => emitter.emit('end');
    const emitError = (e) => emitter.emit('error', e);
    
    const countStream = through2((chunk, encoding, cb) => {
        this._i += chunk.length;
        this._progress();
        
        cb(null, chunk);
    });
    
    log(`cpOneFile cp: ${from} -> ${to}`);
    
    copyDir(dirname(from), dirname(to))
        .then(copyFile(from, to, [countStream]))
        .then(emitFile)
        .catch((e) => {
            if (e.code !== 'EISDIR')
                return emitError(e);
            
            copyDir(from, to)
                .then(emitDirectory)
                .catch(emitError);
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

