// Requires
var express = require('express')
var mongoose = require('mongoose')
var bodyParser = require('body-parser')


// Inicializar variables
var app = express()


// CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DETELE, OPTIONS");
  next();
});



// Body Parser
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


// Importar rutas
var appRoutes = require('./routes/app');
var usuarioRoutes = require('./routes/usuario');
var loginRoutes = require('./routes/login');


// Conexion a base de datos
mongoose.connection.openUri('mongodb://localhost:27017/angularDB', ( err, res ) =>{
  if (err) throw err;

  console.log('Mongo server : \x1b[32m%s\x1b[0m', 'online');
})

// Rutas
app.use('/usuario', usuarioRoutes );
app.use('/login', loginRoutes );
app.use('/', appRoutes );



// Escuchar peticiones
app.listen(3000, () => {
    console.log('Express server puerto 3000: \x1b[32m%s\x1b[0m', 'online');
})
