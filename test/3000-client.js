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




    describe('Client Class', () => {
        it('preparing the app', (done) => {
            const app = new distributed.ServiceManager();

            app.registerService(new RateLimitsService({db: config.db}));
            app.registerService(testService);

            app.load().then(done).catch(done);
        });






        it('Creating a Restriction', function(done) {
            new RelationalRequest({
                  action: 'create'
                , service: 'rate-limit'
                , resource: 'restriction'
                , data: [{
                      actions: ['create', 'read']
                    , resources: ['principal']
                    , service: 'loadThis'
                    , valueType: 'function'
                    , comparator: 'gte'
                    , value: 'now()'
                    , name: 'make sure that stuff happens'
                    , description: ''
                    , property: 'created'
                    , global: true
                    , nullable: true
                    , principals: [{
                          id: 92762
                        , type: 'role'
                    }]
                }]
            }).send(testService).then((response) => {
                if (response.status === 'created') {
                    done();
                } else done(response.toError());
            }).catch(done);
        });






        it('Creating anoter Restriction', function(done) {
            new RelationalRequest({
                  action: 'create'
                , service: 'rate-limit'
                , resource: 'restriction'
                , data: [{
                      actions: ['create', 'read']
                    , resources: ['principal']
                    , service: 'dontLoadThis'
                    , valueType: 'function'
                    , comparator: 'gte'
                    , value: 'now()'
                    , name: 'make sure that stuff happens'
                    , description: ''
                    , property: 'created'
                    , global: true
                    , nullable: true
                    , principals: [{
                          id: 92762
                        , type: 'role'
                    }]
                }]
            }).send(testService).then((response) => {
                if (response.status === 'created') {
                    done();
                } else done(response.toError());
            }).catch(done);
        });






        it('Loading Restrictions', function(done) {
            new Client({
                  gateway: testService
                , serviceName: 'loadThis'
            }).getRestrictions([92762]).then((restirctions) => {
                assert.equal(restirctions.length, 1);

                
                for (const data of restirctions) {

                    assert.equal(!!data.principals, true);
                    assert.equal(data.principals.length, 1);

                    assert.equal(!!data.actions, true);
                    assert.equal(data.actions.length, 2);

                    assert.equal(!!data.resources, true);
                    assert.equal(data.resources.length, 1);


                    assert.equal(data.valueType, 'function');
                    assert.equal(data.comparator, 'gte');
                    assert.equal(data.service, 'loadThis');
                    assert.equal(data.property, 'created');
                    assert.equal(data.value, 'now()');
                    assert.equal(data.nullable, true);
                    assert.equal(data.global, true);
                }

                done();
            }).catch(done);
        });






        it('Loading Restrictions with no matches', function(done) {
            new Client({
                  gateway: testService
                , serviceName: 'loadThis'
            }).getRestrictions([3]).then((restirctions) => {
                assert.equal(restirctions.length, 0);

                done();
            }).catch(done);
        });
    });
})();
