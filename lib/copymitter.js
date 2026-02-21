import process from 'node:process';
import path from 'node:path';
import {readlink} from 'node:fs/promises';
import {inherits} from 'node:util';
import {EventEmitter} from 'node:events';
import debug from 'debug';
import through2 from 'through2';
import currify from 'currify';
import squad from 'squad';
import {tryToCatch} from 'try-to-catch';
import copySymlink from 'copy-symlink';
import {
    read,
    readStat,
    write as _write,
    list,
} from 'redzip';

const log = debug('copymitter');

const isString = (a) => typeof a === 'string';

inherits(Copymitter, EventEmitter);

export const copymitter = (from, to, files, overrides) => {
    check(from, to, files);
    
    return Copymitter(from, to, files, overrides);
};

const removeStr = currify((a, b) => b.replace(a, ''));
const pushValue = currify((array, value) => array.push(value));

function Copymitter(from, to, files, overrides = {}) {
    if (!(this instanceof Copymitter))
        return new Copymitter(from, to, files, overrides);
    
    EventEmitter.call(this);
    
    const {write = _write} = overrides;
    
    this._write = write;
    
    this._files = [];
    this._errors = [];
    this._size = 0;
    this._i = 0;
    this._n = 0;
    this._from = from;
    this._to = to;
    this._count = 0;
    
    this._percent = 0;
    this._percentPrev = 0;
    
    const init = this._init.bind(this, from, files);
    
    process.nextTick(init);
}

Copymitter.prototype._init = async function(from, files) {
    await this._parallel(from, files);
    
    this._n = this._size;
    this._cpAll();
};

Copymitter.prototype._parallel = async function(from, files) {
    let i = files.length;
    const findFiles = this._findFiles.bind(this);
    
    while (--i >= 0) {
        const name = files[i];
        const full = path.join(from, name);
        
        const [error] = await tryToCatch(findFiles, full);
        
        if (error)
            return this.emit('error', error);
    }
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
    this.emit('abort');
};

Copymitter.prototype._cpAll = function() {
    const from = this._from;
    const to = this._to;
    const name = this._files.pop();
    
    if (!name)
        return this.emit('end', {
            errors: this._errors,
        });
    
    const fromFull = path.join(from, name);
    const toFull = path.join(to, name);
    const cpEmitter = this.cpOneFile(fromFull, toFull);
    
    cpEmitter.on('error', (error) => {
        log(`cpEmitter error: ${error}`);
        this.emit('error', error);
        
        this._errors.push(error);
        this._i += 0.01;
    });
    
    cpEmitter.on('end', () => {
        this._progress();
        
        if (this._pause)
            return this.emit('pause');
        
        this._cpAll();
    });
};

const copyDir = async (from, to, overrides = {}) => {
    const {write} = overrides;
    const {mode} = await readStat(from);
    
    await write(to, null, {
        mode,
    });
};

Copymitter.prototype._findFiles = async function(filename) {
    const removeFrom = removeStr(this._from);
    const push = pushValue(this._files);
    const addSize = ({size}) => this._size += size;
    const addName = squad(push, removeFrom);
    
    const names = await list(filename);
    
    const {isDirectory} = await readStat(filename);
    
    if (isDirectory(filename))
        names.push(filename);
    
    const statReaders = names.map(readStat);
    const stats = await Promise.all(statReaders);
    
    this._count = names.length;
    
    names.map(addName);
    stats.map(addSize);
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
    
    copy(from, to, {
        emitError,
        emitFile,
        emitDirectory,
        countStream,
        write: this._write,
    });
    
    return emitter;
};

async function copy(from, to, {emitError, emitFile, emitDirectory, countStream, write}) {
    const info = await readStat(from);
    
    if (info.isDirectory()) {
        const [copyDirError] = await tryToCatch(copyDir, from, to, {
            write,
        });
        
        if (copyDirError)
            return emitError(copyDirError);
        
        return emitDirectory();
    }
    
    const {date, mode} = info;
    
    const [error] = await tryToCatch(superCopy, from, to, [countStream], {
        write,
        date,
        mode,
    });
    
    if (error)
        return emitError(error);
    
    emitFile();
}

async function superCopy(from, to, [countStream], overrides) {
    const {
        write,
        date,
        mode,
    } = overrides;
    const [, link] = await tryToCatch(readlink, from);
    
    if (link) {
        await copySymlink(from, to);
        return;
    }
    
    const readStream = await read(from);
    
    await write(to, readStream.pipe(countStream), {
        mode,
        date,
    });
}

Copymitter.prototype._progress = function() {
    const n = this._n || this._count;
    const value = Math.round(this._i * 100 / n);
    
    this._percent = value;
    
    if (value !== this._percentPrev) {
        this._percentPrev = value;
        this.emit('progress', value);
    }
};

function check(from, to, files) {
    if (!isString(from))
        throw Error('from should be a string!');
    
    if (!isString(to))
        throw Error('to should be a string!');
    
    if (!Array.isArray(files))
        throw Error('files should be an array!');
}
