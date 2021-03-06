// ==================================================
//  MAIN
//  APP.JS
//  Ultima actualización: 16/04/2018
//  Autor: Jorge Macías
// ==================================================

// Requires
var express = require('express')
var bodyParser = require('body-parser')


// Inicializar variables
var app = express()


// CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
  next();
});



// Body Parser
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


// Importar rutas
var usuarioRoutes = require('./routes/usuario');
var loginRoutes = require('./routes/login');
var uploadRoutes = require('./routes/upload');
var imagenesRoutes = require('./routes/imagenes');


// Rutas
app.use('/usuario', usuarioRoutes );
app.use('/login', loginRoutes );
app.use('/upload', uploadRoutes );
app.use('/img', imagenesRoutes );


// Escuchar peticiones
app.listen(3000, () => {
    console.log('Express server puerto 3000: \x1b[32m%s\x1b[0m', 'online');
})
