(function() {
    'use strict';




    module.exports = class RateLimitInstance {



        constructor(options) {
            this.currentValue = options.currentValue;
            this.credits = options.credits;
            this.interval = options.interval;
            this.client = options.client;
            this.request = options.request;
        }





        /**
        * pay rate limit, set metadata on the response
        */
        pay(cost) {
            const response = this.request.getResponse();
            const permissions = request.getTrustedModule('permissions');

            // first, set meta
            response.setMetaData('rate-limit-cost', (response.hasMetaData('rate-limit-cost') ? response.getMetaData('rate-limit-cost')+cost : cost));


            // pay now
            return this.client.pay(permissions, cost).then((limit) => {
                if (limit && limit.hasLimit) this.currentValue = limit.currentValue;

                // return myself
                return Promise.resolve(this);
            });
        }






        /**
        * serialize
        */
        toJSON() {
            return {
                  currentValue: this.currentValue
                , credits: this.credits
                , interval: this.interval
            };
        }
    };
})();
