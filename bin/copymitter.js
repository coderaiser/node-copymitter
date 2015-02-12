#!/usr/bin/env node

(function() {
    'use strict';
    
    var copymitor   = require('..');
    
    copy();
    
    function copy() {
        var cp,
            from    = '/home/coderaiser/copymitter/node_modules/pipe-io',
            to      = '/home/coderaiser/copymitter/example',
            files   = [
                'sldfjdlsfj',
                '.npmignore',
                'ChangeLog',
                'LICENSE',
                'README.md',
                'package.json'
            ];
        
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
})();
