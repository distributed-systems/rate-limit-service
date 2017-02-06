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



    let limitId;



    describe('Paying and Getting', () => {
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
                          id: 78956612
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





        it('Paying a costs', function(done) {
            new RelationalRequest({
                  action: 'createOrUpdateOne'
                , service: 'rate-limit'
                , resource: 'bucket'
                , data: {
                      limitId: limitId
                    , token: 'not-so-random-token'
                    , cost: 8000
                }
            }).send(testService).then((response) => {
                if (response.status === 'ok') {

                    assert.equal(!!response.data, true);
                    assert.equal(response.data.currentValue, 192000);

                    done();
                } else done(response.toError());
            }).catch(done);
        });






        it('Loading Limits', function(done) {
            new RelationalRequest({
                  action: 'list'
                , service: 'rate-limit'
                , resource: 'bucket'
                , filter: new FilterBuilder().property('token').comparator('=').value('not-so-random-token')
                , selection: ['*']
            }).send(testService).then((response) => {
                if (response.status === 'ok') {

                    assert.equal(!!response.data, true);
                    assert.equal(response.data.length, 1);

                    for (const data of response.data) {
                        assert.equal(data.currentValue, 192000);
                    }

                    done();
                } else done(response.toError());
            }).catch(done);
        });






        it('Loading credits for a set of tokens', function(done) {
            new RelationalRequest({
                  action: 'createOrUpdateOne'
                , service: 'rate-limit'
                , resource: 'limit'
                , data: [{
                      token: 'not-so-random-token'
                    , principals: [{
                          id: 78956612
                        , type: 'role'
                    }] 
                }]
            }).send(testService).then((response) => {
                if (response.status === 'ok') {

                    assert.equal(!!response.data, true);
                    assert.equal(response.data.currentValue, 192000);

                    done();
                } else done(response.toError());
            }).catch(done);
        });






        it('Paying credits for a set of tokens', function(done) {
            new RelationalRequest({
                  action: 'createOrUpdateOne'
                , service: 'rate-limit'
                , resource: 'limit'
                , data: [{
                      token: 'not-so-random-token'
                    , principals: [{
                          id: 78956612
                        , type: 'role'
                    }]
                    , cost: 60000
                }]
            }).send(testService).then((response) => {
                if (response.status === 'ok') {

                    assert.equal(!!response.data, true);
                    assert(response.data.currentValue < 133000);

                    done();
                } else done(response.toError());
            }).catch(done);
        });
    });
})();
