// ==================================================
//  OPERACINES PARA MOSTRAR IMAGENES
//  IMAGENES.JS
//  Ultima actualización: 16/04/2018
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

// File system para realizar operaciones con archivos
var fs = require('fs');

// ==================================================
// OPERACIONES
// ==================================================


// ========================
// OPERACION PARA MOSTRAR IMAGENES
// ========================
app.get('/:tipo/:img', ( req, res, next ) =>{

  var tipo = req.params.tipo;
  var img = req.params.img;

  var path = `./uploads/${ tipo }/${ img }`;

  fs.exists( path, existe => {

    if ( !existe ) {
      path = `./assets/img/no-img.jpg`;
    }

    res.sendfile( path );
  });

});

module.exports = app;
