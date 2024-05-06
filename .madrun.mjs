import {run} from 'madrun';

const coverageEnv = {
    SUPERTAPE_TIMEOUT: 4000,
};

export default {
    'watch:coverage': () => run('watcher', 'npm run coverage'),
    'watch:test': () => run('watcher', 'npm test'),
    'watcher': () => 'nodemon -w test -w lib --exec',
    'test': () => 'tape test/*.js',
    'coverage': async () => [coverageEnv, `c8 ${await run('test')}`],
    'report': () => 'c8 report --reporter=lcov',
    'lint': () => 'putout .',
    'fresh:lint': () => run('lint', '--fresh'),
    'lint:fresh': () => run('lint', '--fresh'),
    'fix:lint': () => run('lint', '--fix'),
};
