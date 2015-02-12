#!/usr/bin/env node

(function() {
    'use strict';
    
    var copymitor   = require('..'),
        glob        = require('glob'),
        args        = process.argv.slice(2),
        arg         = args[0];
        
    if (/^(-v|--v)$/.test(arg))
        version();
    else if (!arg || /^(-h|--help)$/.test(arg))
        help();
    else
        glob(arg, function(error, files) {
            var to      = args[1],
                from    = process.cwd();
            
            if (error)
                console.error(error.message);
            else
                main(from, to, files);
        });
       
    function main(from, to, files) {
        var cp;
        
        cp = copymitor(from, to, files);
        
        cp.on('file', function(name, i, percent) {
            console.log(percent + ' ->', name);
        });
        
        cp.on('error', function(error, name, i, percent) {
            console.error(percent + ' ->', name, ':', error.message);
            cp.continue();
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
