// ==================================================
//  OPERACIONES CON USUARIOS
//  USUARIO.JS
//  Ultima actualización: 16/04/2018
//  Autor: Jorge Macías
// ==================================================


// ==================================================
// REQUIRES
// ==================================================
var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

// mysql
var mysql = require('mysql');


// Middlewares valida token
var mdAutenticacion = require('../middlewares/autenticacion');

// ========================
// EXPRESS
// ========================
// Express para el manejo de las rutas
var app = express();



var Usuario = require('../models/usuario');

// ======================================
//  CREAR USUARIO
// ======================================
app.post('/' ,( req, res) =>{

  // Obtiene el body
  var body = req.body;

  // Se crea el modelo que se grabara
  var usuario = new Usuario({
    nombre: body.nombre,
    email: body.email,
    password: bcrypt.hashSync(body.password, 10), // Se guarda el password encriptado
    img: body.img,
    role: body.role
  });

  // Se graba el usuario
  usuario.save( (err, usuarioGuardado) => {

    // Si se genera un error
    if (err){
      return res.status(400).json({
        ok: false,
        mensaje: 'Error al crear el usuario',
        errors: err
      });
    }

    // Si todo es correcto
    res.status(201).json({
      ok: true,
      usuario: usuarioGuardado,
      ususarioToken: req.usuario
    });

  })
  // end save

});

// ======================================
//  OBTENER TODOS LOS USUARIOS
// ======================================
app.get('/', mdAutenticacion.verificaToken, ( req, res, next ) =>{

  var desde = req.query.desde || 0;
  desde = Number(desde);

  Usuario.find({}, 'nombre email img role google')
    .skip(desde)
    .limit(5)
    .exec(
    (err, usuarios)=>{

      // Manda un 500 si se genera un error al obtener los usuarios
      if (err){
        return res.status(500).json({
          ok: false,
          mensaje: 'Error al obtener los usuarios',
          errors: err
        });
      }

      Usuario.count({}, (err, count) =>{

        // Si sucede algún error al obtener la cantidad de usuarios
        if (err){
          return res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener el conteo de los usuarios',
            errors: err
          });
        }

        // Si todo es correcto manda los usuarios
        res.status(200).json({
          ok: true,
          usuarios: usuarios,
          total: count,
          posicion: desde+usuarios.length
        });

      });


  });
  // end find

});




// ======================================
//  ACTUALIZAR USUARIO
// ======================================
app.put('/:id', [mdAutenticacion.verificaToken, mdAutenticacion.verificaAdminRole_Mismo_Usuario],  ( req, res) =>{

  // Se obtiene el id del path
  var id = req.params.id;

  // Se obtiene el body
  var body = req.body;

  // se valida que el id del usuario sea valido
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El id no es válido',
      errors: { message: 'El id no cumple con el estandar'}
    });
  }

  // Se busca el usuario en base de datos
  Usuario.findById(id, (err, usuario) => {

    // Si ocurre un error al buscar el  ususario retorna un error 500 y termina
    if (err){
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al buscar el usuario',
        errors: err
      });
    }

    // Si el usuario no existe retorna un 400 por que debe enviar un usuario correcto
    if ( !usuario ){
      return res.status(400).json({
        ok: false,
        mensaje: 'Usuario con id: '+ id + ' no existe',
        errors: { message: 'No existe un usuario con el ID especificado'}
      });
    }

    // Parsea la información del usuario al de la base de datos
    usuario.nombre  = body.nombre;
    usuario.email   = body.email;
    usuario.role    = body.role;

    if (body.password != null){
      usuario.password    = bcrypt.hashSync(body.password, 10);
    }

    // Guarda los cambios
    usuario.save( (err, usuarioGuardado ) => {

      // Si ocurre algun error al registrar la información se retorna un 400
      // por que puede que falte algun atributo del usuario
      if (err){
        return res.status(400).json({
          ok: false,
          mensaje: 'Error al actualizar usuario',
          errors: err
        });
      }

      usuario.password = ':)';

      // Si todo es correcto manda un 200 con el usuario actualizado
      res.status(200).json({
        ok: true,
        usuario: usuarioGuardado
      });

    });
    // fin del save

  });
  // fin del findById
});


// ======================================
//  ELIMINAR USUARIO
// ======================================
app.delete('/:id', mdAutenticacion.verificaToken, ( req, res) =>{

  //Obtiene el id que se envía por path
  var id = req.params.id;

  // se valida que el id del usuario sea valido
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El id no es válido',
      errors: { message: 'El id no cumple con el estandar'}
    });
  }

  // Busca el usuario por id y lo elimina
  Usuario.findByIdAndRemove(id, (err, usuarioBorrado ) => {

    // Si ocurre algunn error al eliminar el usuario
    if (err){
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al borrar el usuario',
        errors: err
      });
    }

    // Si el usuario no existe retorna un 400 por que debe enviar un usuario correcto
    if ( !usuarioBorrado ){
      return res.status(400).json({
        ok: false,
        mensaje: 'Usuario con id: '+ id + ' no existe',
        errors: { message: 'No existe un usuario con el ID especificado'}
      });
    }

    // Si todo es correcto manda un 200 con el usuario eliminado
    res.status(200).json({
      ok: true,
      usuario: usuarioBorrado
    });

  });
  // end findByIdAndRemove

});


// ======================================
//  PRUEBA MYSQL
// ======================================
app.get('/mysql', ( req, res) =>{

  var connection = mysql.createConnection({
   host: 'localhost',
   user: 'jmacias',
   password: 'root',
   database: 'ORTODONCIA_ESPECIALIZADA',
   port: 3306
 });

  connection.connect(function(error){
     if(error){
        throw error;
     }else{
        console.log('Conexion correcta.');
     }
  });
  var query = connection.query('SELECT * FROM USUARIOS', [1], function(error, result){
      if(error){
         throw error;
      }else{
         var resultado = result;
         if(resultado.length > 0){
           res.status(200).json({
             ok: true,
             usuario: resultado
           });
         }else{
            console.log('Registro no encontrado');
         }
      }
   }
);
connection.end();
});

// ======================================
//  OBTENER TODOS LOS USUARIOS
// ======================================
app.get('/busqueda/:usuario',mdAutenticacion.verificaToken, ( req, res) =>{
  var busqueda = req.params.usuario;

  var regex = new RegExp( busqueda, 'i' );

  Usuario.find({ nombre: regex }, (err, usuarios) => {

    // Si ocurre algunn error al buscar el usuario
    if (err){
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al buscar el usuario',
        errors: err
      });
    }

    res.status(200).json({
      ok: true,
      usuarios: usuarios,
      posicion: usuarios.length
    });

  });


});


module.exports = app;
