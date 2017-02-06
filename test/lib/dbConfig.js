(function() {
    'use strict';


    let config = {
          database: 'distributed_test'
        , user: 'postgres'
        , pass: '2GLKPc58672cOuNqow16'
        , port: 5432
        , host: '10.80.100.1'
    };




    try {
        config = require('../../config.test.js');
    } catch (e) {}




    module.exports = config;
})();
