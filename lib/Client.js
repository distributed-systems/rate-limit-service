(function() {
    'use strict';


    const log                   = require('ee-log');
    const distributed           = require('distributed-prototype');
    const RequestMiddleware     = distributed.RequestMiddleware;
    const RelationalRequest     = distributed.RelationalRequest;
    const RateLimitInstance     = require('./RateLimitInstance');




    module.exports = class RateLimitClient extends RequestMiddleware {


        constructor(options) {
            super();

            // gateway to other services
            this.gateway = options.gateway;

            // need to know our service
            this.serviceName = options.serviceName;
        }





        hookIncomingRequests() {
         
            return true;
        }


        hookOutgoingRequests() {
            return true;
        }








        /**
         * passes rate limit info from incoming response to outgoing response 
         */
        processOutgoingRequest(request, response) {
                
            // its only of any use if the outgoing request has knowledge
            // of the originatig request
            if (request.hasOrigin()) {

                // wait for the response to be sent
                response.onSend = () => {

                    // we need the  origin response to write our 
                    // data on
                    const originResponse = request.getOrigin().getResponse();


                    // check if there is any cost recorded on the response
                    if (response.hasMetaData('rate-limit-cost')) {
                        const originalCost = originResponse.hasMetaData('rate-limit-cost') ? originResponse.getMetaData('rate-limit-cost') : 0;


                        // add both costs, write them on the origin
                        originResponse.setMetaData('rate-limit-cost', originalCost+response.hasMetaData('rate-limit-cost'));
                    }
                }
            }


            return Promise.resolve();
        }









        /**
        * get the row restrictions for the current request
        */
        processIncomingRequest(request, response) {
            // dont limit the rate limits
            if (request.service === this.serviceName && request.resource === 'limit') return Promise.resolve();
            else {


                // cannot process without permissions
                if (request.hasTrustedModule('permissions')) {

                    // get the limit from the remote service
                    return this.getLimit(request.getTrustedModule('permissions')).then((limit) => {


                        // continue if there is no limit
                        if (limit && limit.hasLimit) {


                            // make limit accessible
                            request.setTrustedModule('rate-limit', new RateLimitInstance({
                                  currentValue: limit.currentValue
                                , credits: limit.credits
                                , interval: limit.interval
                                , client: this
                                , request: request
                            }));



                            // set data on the outgoing response
                            response.onSend = () => {
                                response.setMetaData('rate-limit-interval', limit.interval+'s');
                                response.setMetaData('rate-limit-credits', limit.credits);
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
        }









        /**
        * pay the limit based on the permissiosn
        * passed to the module
        */
        pay(permissions, cost) {
            const tokens = permissions.getTokenRoleIds().map(token => ({
                  token: token.token
                , cost: cost
                , principals: token.roles.map(r => ({
                      id: r
                    , type: 'role'
                }))
            }));

            return this.loadLimit(tokens);
        }





        /**
        * load the current limit based on the permissions
        * passed into the function
        */
        getLimit(permissions) {
            const tokens = permissions.getTokenRoleIds().map(token => ({
                  token: token.token
                , principals: token.roles.map(r => ({
                      id: r
                    , type: 'role'
                }))
            }));

            return this.loadLimit(tokens);
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
                , resourceId: '1' // workaround for the legacy system
                , data: tokens
            }).send(this.gateway).then((response) => {
                if (response.status === 'ok') return Promise.resolve(response.data);
                else return Promise.resolve();
            });
        }
    }
})();
