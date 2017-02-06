(function() {
    'use strict';

    // donj't restrict permissions
    process.env.allowAll = true;


    const DBRestore = require('db-restore');
    const config = require('./lib/dbConfig');
    const path = require('path');


    describe('Database', () => {
        it('Drop & Restore Schema & Data', (done) => {
            new DBRestore({
                  config: config
                , dataDir: path.join(__dirname, 'data')
                , silent: true
            }).restore().then(() => done()).catch(done);
        });
    });
})();
