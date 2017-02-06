(function() {
    'use strict';

    // donj't restrict permissions
    process.env.allowAll = true;


    const distributed               = require('distributed-prototype');
    const RelationalRequest         = distributed.RelationalRequest;
    const FilterBuilder             = distributed.FilterBuilder;
    const SelectionBuilder          = distributed.SelectionBuilder;
    const RateLimitsService         = require('../index');
    const config                    = require('./lib/relatedDBConfig');
    const log                       = require('ee-log');
    const assert                    = require('assert');




    const testService = new distributed.TestService();




    describe('Creating Limits', () => {
        it('preparing the app', (done) => {
            const app = new distributed.ServiceManager();

            app.registerService(new RateLimitsService({db: config.db}));
            app.registerService(testService);

            app.load().then(done).catch(done);
        });






        it('Creating a Limit', function(done) {
            new RelationalRequest({
                  action: 'create'
                , service: 'rate-limit'
                , resource: 'limit'
                , data: [{
                      interval: 60
                    , credits: 200000
                    , principals: [{
                          id: 1221
                        , type: 'role'
                    }]
                }]
            }).send(testService).then((response) => {
                if (response.status === 'created') {
                    done();
                } else done(response.toError());
            }).catch(done);
        });






        it('Loading Limits', function(done) {
            const filter = new FilterBuilder().entity('principal').and();
            filter.property('principalId').fn('in', [1,2,3,4, 1221]);
            filter.entity('principalType').property('identifier').comparator('=').value('role')


            new RelationalRequest({
                  action: 'list'
                , service: 'rate-limit'
                , resource: 'rateLimit'
                , filter: filter
                , selection: ['*']
                , relationalSelection: new SelectionBuilder().select('rate-limit', 'principal', ['*'])
            }).send(testService).then((response) => {
                if (response.status === 'ok') {

                    assert.equal(!!response.data, true);
                    assert.equal(response.data.length, 1);

                    for (const data of response.data) {

                        assert.equal(!!data.principal, true);
                    }

                    done();
                } else done(response.toError());
            }).catch(done);
        });
    });
})();
