#!/usr/bin/env node

(function() {
    'use strict';
    
    var cp,
        copymitor   = require('../lib/copymitor');
    
    copy();
    
    function copy() {
        var from    = '/home/coderaiser/copymitor/node_modules/pipe-io',
            to      = '/home/coderaiser/copymitor/example';
        
        cp = copymitor(from, to, [
            'lib',
            '.npmignore',
            'ChangeLog',
            'LICENSE',
            'README.md',
            'package.json'
        ]);
        
        cp.on('file', function(data) {
            console.log(data);
        });
        
        cp.on('error', function(error, name) {
            console.error(name, ':', error.message);
            cp.emit('continue');
        });
        
        cp.on('end', function() {
            console.log('end');
        });
    }
})();
