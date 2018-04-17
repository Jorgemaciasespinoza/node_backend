// ==================================================
//  APP.JS
//  Ultima actualización: 28/03/2018
//  Autor: Jorge Macías
// ==================================================


// ==================================================
// REQUIRE
// ==================================================
var express = require('express');


// ========================
// EXPRESS
// ========================
// Express para el manejo de las rutas
var app = express();
var app = express();


// ==================================================
// OPERACIONES
// ==================================================


// ========================
// TEMPLATE OPERACION
// ========================
app.get('/', ( req, res, next ) =>{

  res.status(200).json({
    ok: true,
    mensaje: 'Petición realizada correctamente'
  })

});

module.exports = app;
