#!/usr/bin/env node

(function() {
    'use strict';
    
    var copymitor   = require('..'),
        args        = process.argv.slice(2),
        arg         = args[0];
        
    if (/^(-v|--v)$/.test(arg))
        version();
    else if (!arg || /^(-h|--help)$/.test(arg))
        help();
    else
        main(args[0], args[1]);
       
    function main(file, to) {
        var cp,
            from    = process.cwd(),
            files   = [file];
        
        cp = copymitor(from, to, files);
        
        cp.on('file', function(name, i, percent) {
            console.log(percent + ' ->', name);
        });
        
        cp.on('error', function(error, name, i, percent) {
            console.error(percent + ' ->', name, ':', error.message);
            cp.emit('continue');
        });
        
        cp.on('end', function() {
            console.log('end');
        });
    }
    
    function version() {
        console.log('v' + info().version);
    }
    
    function info() {
        return require('../package');
    }
    
    function help() {
        var bin         = require('../json/bin'),
            usage       = 'Usage: ' + info().name + ' [filename] [distanation path]';
            
        console.log(usage);
        console.log('Options:');
        
        Object.keys(bin).forEach(function(name) {
            var line = '  ' + name + ' ' + bin[name];
            console.log(line);
        });
    }
})();
