var mysql = require('mysql');

var pool      =    mysql.createPool({
    connectionLimit : 1, //important
    host     : 'localhost',
    user     : 'jmacias',
    password : 'root',
    database : 'gema',
    debug    :  false
});


module.exports = pool;
