(function() {
    'use strict';

    const distributed                   = require('distributed-prototype');
    const RelationalResourceController  = distributed.RelationalResourceController;
    const RelationalRequest             = distributed.RelationalRequest;
    const FilterBuilder                 = distributed.FilterBuilder;
    const log                           = require('ee-log');
    const Cachd                         = require('cachd');
    const LeakyBucket                   = require('leaky-bucket');






    module.exports = class Limit extends RelationalResourceController {


        constructor(options) {
            super('limit');

            // db from the service
            this.db = options.db;
            this.Related = options.Related;

            // publish interface
            this.enableAction('createOne');
            this.enableAction('create');
            this.enableAction('createOrUpdateOne');


            
            // the actual rate limit cache
            this.bucketCache = new Cachd({
                  ttl: 90000
                , maxLength: 10000
                , removalStartegy: 'leastUsed'
            });


            // cache the selction of the bucket to use
            // for a given role combination
            this.limitCache = new Cachd({
                  ttl: 3600000
                , maxLength: 1000
                , removalStartegy: 'leastUsed'
            });
        }










        /**
        * a bit unconvential since this is mainly a reading
        * request, but it makes it easier since the payload 
        * can be used for sending configurations
        */
        createOrUpdateOne(request, response) {
            if (request.hasData() && Array.isArray(request.data)) {

                // process the limits for each token separaatels
                return Promise.all(request.data.map((config) => {


                     // get the lowest limit for the roles assigned to a token
                    return Promise.resolve().then(() => {

                         // check out the cache, maybe it knows what to return
                        if (this.limitCache.has(config.token)) return this.limitCache.get(config.token);
                        else {

                            // get all teh elimits
                            const promise = Promise.all(config.principals.map((principal) => {


                                // get from db
                                return this.db.rateLimit(['id', 'credits', 'interval']).getPrincipal({
                                    principalId: principal.id
                                }).getPrincipalType({
                                    identifier: principal.type
                                }).findOne().then((limit) => {
                                    if (limit) return Promise.resolve(limit);
                                    else return Promise.resolve();
                                });
                            })).then((limits) => {

                                // get lowest one
                                limits = limits.filter(l => !!l);
                                limits.sort((a, b) => a.credits < b.credits ? -1 : 1);

                                return Promise.resolve(limits.length ? limits[0] : null);
                            });

                            this.limitCache.set(config.token, promise);

                            return promise;
                        }
                    }).then((limit) => {


                        // no limit?
                        if (!limit) {
                            return Promise.resolve({
                                  token: config.token
                                , hasLimit: false
                            });
                        }
                        else {


                            // get a level deeper since we're returning above
                            return Promise.resolve().then(() => {


                                // get bucket
                                if (this.bucketCache.has(config.token)) {


                                    // we need to pay costs 
                                    return this.bucketCache.get(config.token).then((bucket) => {

                                        // pay
                                        if (bucket && config.cost) {
                                            bucket.bucket.pay(config.cost);


                                            // write to db
                                            new RelationalRequest({
                                                  action: 'createOrUpdateOne'
                                                , service: this.getServiceName()
                                                , resource: 'bucket'
                                                , data: {
                                                      token: config.token
                                                    , limitId: limit.id
                                                    , cost: config.cost
                                                }
                                            }).send(this).catch(log);
                                        } 

                                        return Promise.resolve(bucket);
                                    });
                                }
                                else {


                                    // ask the remote controller
                                    const promise = new RelationalRequest({
                                          action: 'createOrUpdateOne'
                                        , service: this.getServiceName()
                                        , resource: 'bucket'
                                        , data: {
                                              token: config.token
                                            , limitId: limit.id
                                            , cost: config.cost || 0
                                        }
                                    }).send(this).then((bucketResponse) => {
                                        if (bucketResponse.status === 'ok') {
                                            return Promise.resolve({
                                                bucket: new LeakyBucket({
                                                      capacity: bucketResponse.hasObjectData() ? bucketResponse.data.currentValue : limit.credits
                                                    , interval: limit.interval
                                                }) 
                                                , token: config.token
                                                , hasLimit: true
                                                , interval: limit.interval
                                                , credits: limit.credits
                                            });                                   
                                        } else return Promise.reject(bucketResponse.toError());
                                    });


                                    this.bucketCache.set(config.token, promise);


                                    return promise;
                                }
                            });
                        }
                    });
                })).then((buckets) => {

                    // filter, sort and return the lowest value
                    buckets = buckets.filter((b => !!b));
                    let limitedBuckets = buckets.filter(l => l.hasLimit).sort((a, b) => a.bucket.getInfo().left < b.bucket.getInfo().left ? -1 : 1);

                    if (!limitedBuckets.length) limitedBuckets = buckets.filter(l => !l.hasLimit);
                    
                    response.ok(limitedBuckets.length ? {
                          token: limitedBuckets[0].token
                        , hasLimit: buckets[0].hasLimit
                        , currentValue: buckets[0].hasLimit ? buckets[0].bucket.getInfo().left : null
                        , interval: buckets[0].interval
                        , credits: buckets[0].credits
                    } : null);
                }).catch(err => response.error('bucket_error', `Failed to create a valid bucket!`, err));
            } else reponse.ok([]);
        }










        /**
        * creates a new ratelimit
        */
        create(request, response) {


            // check if there is valid payload
            if (Array.isArray(request.data)) {
                const transaction = this.db.createTransaction();


                Promise.all(request.data.map((limit) => {

                    // make sure all pricinpials exits
                    return Promise.all((limit.principals || []).map((principal) => {
                        return transaction.principal({principalId: principal.id}).getPrincipalType({identifier: principal.type}).findOne().then((prin) => {
                            if (!prin) {
                                return new transaction.principal({
                                      principalId: principal.id
                                    , principalType: transaction.principalType({
                                        identifier: principal.type
                                    })
                                }).save();
                            } else return Promise.resolve(prin);
                        });
                    })).then((principals) => {


                        // rceate the restirction already ...
                        return new transaction.rateLimit({
                              interval      : limit.interval
                            , credits       : limit.credits
                            , principal     : principals
                        }).save();
                    });
                })).then((limits) => {

                    // commit
                    return transaction.commit().then(() => {

                        // done
                        response.created(limits.map(r => r.id));
                    });
                }).catch((err) => {

                    // roll back but dont wait for that
                    transaction.rollback();

                    response.error('db_error', `Failed to create limit(s)!`, err);
                });
            } else return response.badRequest('missing_payload', `Cannot create limits, the payload is missing!`);
        }
    }
})();
