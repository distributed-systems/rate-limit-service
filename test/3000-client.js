(function() {
    'use strict';

    // donj't restrict permissions
    process.env.allowAll = true;


    const distributed               = require('distributed-prototype');
    const RelationalRequest         = distributed.RelationalRequest;
    const FilterBuilder             = distributed.FilterBuilder;
    const RateLimitsService         = require('../index');
    const config                    = require('./lib/relatedDBConfig');
    const log                       = require('ee-log');
    const assert                    = require('assert');
    const Client                    = require('../index').Client;




    const testService = new distributed.TestService();

    let limitId;


    describe('Client Class', () => {
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
                          id: 123123
                        , type: 'role'
                    }]
                }]
            }).send(testService).then((response) => {
                if (response.status === 'created') {
                    limitId = response.data.id[0];
                    done();
                } else done(response.toError());
            }).catch(done);
        });





        it('Instantiating the client', function(done) {
            new Client({gateway: testService.createGateway()}).load().then(done).catch(done);
        });




        it('Getting the current limit', function(done) {
            const client = new Client({gateway: testService.createGateway()});

            client.load().then(() => {
                return client.loadLimit([{
                      token: 'sad'
                    , principals: [{
                          id: 123123
                        , type: 'role'
                    }]
                }]).then((limit) => {
                    assert(limit);
                    assert.equal(limit.hasLimit, true);
                    assert.equal(limit.currentValue, 200000);
                    assert.equal(limit.credits, 200000);
                    assert.equal(limit.interval, 60);

                    done();
                });
            }).catch(done);
        });
    });
})();
