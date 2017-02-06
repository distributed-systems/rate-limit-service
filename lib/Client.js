(function() {
    'use strict';


    const log                   = require('ee-log');
    const distributed           = require('distributed-prototype');
    const RequestMiddleware     = distributed.RequestMiddleware;




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
                const roles = Array.from(request.getTrustedModule('permissions').getRoleIds());


                return this.getRateLimit(roles).then((restrictions) => {


                    // store on request
                    request.setTrustedModule('rate-limit', restrictions);


                    // continue
                    return Promise.resolve();
                }).catch((err) => {
                    response.error('row_restrictions_error', `Failed to laod rate-limit!`, err)
                
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
        loadLimit(principalIds) {

        }
    }
})();
