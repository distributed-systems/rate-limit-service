(function() {
    'use strict';


    const log                   = require('ee-log');
    const distributed           = require('distributed-prototype');
    const RequestMiddleware     = distributed.RequestMiddleware;
    const RelationalRequest     = distributed.RelationalRequest;




    module.exports = class RateLimitClient extends RequestMiddleware {


        constructor(options) {
            super();

            // gateway to other services
            this.gateway = options.gateway;
        }




        /**
        * get the row restrictions for the current request
        */
        processRequest(request, response) {


            if (request.hasTrustedModule('permissions')) {
                const tokens = request.getTrustedModule('permissions').getTokenRoleIds().map(token => ({
                    token: token.token
                    , principals: token.roles.map(r => ({
                          id: r
                        , type: 'role'
                    }))
                }));



                // get the limit from the remote service
                return this.loadLimit(tokens).then((limit) => {


                    // continue if there is no limit
                    if (limit) {


                        // set data on the outgoing response
                        response.onAfterSend = () => {
                            response.setMetaData('rate-limit-interval', limit.interval+'s');
                            response.setMetaData('rate-limit-credits', limit.credits);
                            response.setMetaData('rate-limit-cost', limit.cost);
                            response.setMetaData('rate-limit-value', limit.currentValue);
                        };
                        


                        // got a limit, check if there are enough credits left
                        if (limit.currentValue <= 0) {


                            // return error
                            response.tooManyRequests(limit.interval, limit.credits, limit.currentValue);


                            // cancel here, dont process otherm iddlewares or the controller
                            return Promise.resolve(true);
                        } else return Promise.resolve();
                    } else return Promise.resolve();
                }).catch((err) => {
                    response.error('rate_limit_error', `Failed to load rate-limit!`, err)
                
                    // this was the last middleware that has to be called
                    // the response is sent
                    return Promise.resolve(true);
                });
            } else {
                

                // dont activate rate limits for this request
                return Promise.resolve();
            }
        }







        /**
        * get the current limit from the remote
        * service, returns the lowest value
        */
        loadLimit(tokens) {
            return new RelationalRequest({
                  action: 'createOrUpdateOne'
                , service: 'rate-limit'
                , resource: 'limit'
                , data: tokens
            }).send(this.gateway).then((response) => {
                if (response.status === 'ok') return Promise.resolve(response.data);
                else return Promise.reject(response.toError());
            });
        }
    }
})();
