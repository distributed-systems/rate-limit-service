(function() {
    'use strict';

    const distributed                   = require('distributed-prototype');
    const RelatedResourceController     = distributed.RelatedResourceController;
    const log                           = require('ee-log');






    module.exports = class Bucket extends RelatedResourceController {


        constructor(options) {
            super(options, 'bucket');


            // publish interface
            this.enableAction('list');
            this.enableAction('createOrUpdateOne');
        }







        createOrUpdateOne(request, response) {
            const sql = `select * from "rate_limit_service"."createOrUpdateBucket"($1, $2, $3);`

            if (request.hasObjectData()) {
                const data = request.data;
                
                return this.db.executeQuery(sql, [data.limitId, data.token, data.cost]).then((result) => {
                    if (result && result.length) {
                        return Promise.resolve(Object.assign({
                            currentValue: parseInt(result[0].createOrUpdateBucket+'', 10)
                        }, data));
                    } else return Promise.reject(`Failed to create bucket for ${data.token}`);
                }).then((result) => {
                    response.ok(result);
                }).catch(err => response.error('db_error', `Failed to update bucket!`, err))
            } else response.ok();
        }
    }
})();
