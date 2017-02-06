(function() {
    'use strict';

    // donj't restrict permissions
    process.env.allowAll = true;


    const RateLimitsService = require('../index');
    const config = require('./lib/relatedDBConfig');



    describe('Service', () => {
        it('Basic execution check', () => {
            new RateLimitsService({
                db: config.db
            });
        });
    });
})();
