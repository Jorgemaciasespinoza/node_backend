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

// Pool de conexiones
var pool = require('../config/conexion_db')

// Middlewares valida token
var mdAutenticacion = require('../middlewares/autenticacion');

// ==================================================
// EXPRESS
// ==================================================
// Express para el manejo de las rutas
var app = express();


// ==================================================
// OPERACIONES
// ==================================================


// ==================================================
//  CREAR USUARIO
// ==================================================
  app.post('/' ,( req, res) =>{

    // TODO
    // Falta validar campos

    // Obtiene el body de la solicitud
    var body = req.body;

    // Encripta la contraseña
    var password = bcrypt.hashSync(body.password, 10);

    // Se obtiene un hilo de la conexion
    pool.getConnection( (err,conexion) => {

      if (err) {
        return res.status(500).json({
          ok: false,
          mensajeUsuario: 'Error al establecer comunicación con el servidor de datos, intente más tarde.',
          mensajeTecnico: { errors: err},
          code: '700'
        });
      }

      // Prepara el inset
      var sql = "INSERT INTO ct_usuarios (fk_rol,nombre,email,password,imagen) VALUES ?";
      var values = [['1',body.nombre,body.email, password,null]];

      // Ejecuta consulta
      conexion.query(sql, [values], function (err, result) {

        // Libera la conexion
        conexion.release();

        if (err){
          // Si ocurrre error al realizar insercción retorna 500
          if (err.sqlState === '23000') {
            return res.status(400).json({
              ok: false,
              mensajeUsuario: 'Error al registrar usuario, ya existe el correo: '+ body.email,
              mensajeTecnico: { errors: {code: err.code, sqlState: err.sqlState, sqlMessage: err.sqlMessage } },
              code: '701'
            });
          }
          else{
            return res.status(500).json({
              ok: false,
              mensajeUsuario: 'Error al registrar usuario, intente más tarde',
              mensajeTecnico: {errors: err },
              code: '702'
            });
          }

        }

        // Si todo es correcto responde con el email creado
        res.status(200).json({
          ok: true,
          mensaje: 'Usuario registrado correctamente',
          email: body.email
        });

      });

    });
    // end pool
  });


// ==================================================
//  OBTENER TODOS LOS USUARIOS
// ==================================================
app.get('/', mdAutenticacion.verificaToken, ( req, res, next ) =>{

  var desde = req.query.desde || 0;
  desde = Number(desde);

  // Se obtiene un hilo de la conexion
  pool.getConnection( (err,conexion) => {

    if (err) {
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al obtener conexión con la base de datos',
        errors: err
      });
    }

    var query = conexion.query("  select "
        +"u.pk_usuario, "
        +"u.nombre, "
        +"u.email, "
        +"u.imagen, "
        +"r.nombre as rol, "
        +"u.google_auth "
      +"from "
        +"ct_usuarios u inner join ct_roles r on u.fk_rol = r.pk_rol where u.activo ='1' LIMIT 5 OFFSET "+desde, (error, results, field) => {

      // Libera la conexion
      conexion.release();

      if (error){

        return res.status(500).json({
          ok: false,
          mensaje: 'Error al realizar consulta en base de datos',
          errors: error
        });

      }

      // Si todo es correcto responde con el email creado
      res.status(200).json({
        ok: true,
        usuarios: results
      });

    });
    // end qry

    });
  // end pool

});


// ==================================================
//  BUSCAR LOS USUARIOS POR NOMBRE
// ==================================================
app.get('/busqueda/:usuario',mdAutenticacion.verificaToken, ( req, res) =>{

  var busqueda = req.params.usuario;

  pool.getConnection( (err,conexion) => {

    // Si ocurre algun error al obtener el hilo de la conexion
    if (err) {
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al obtener conexión con la base de datos',
        errors: err
      });
    }

    var query = conexion.query("  select "
        +"u.pk_usuario, "
        +"u.nombre, "
        +"u.email, "
        +"u.imagen, "
        +"r.nombre as rol, "
        +"u.google_auth "
      +"from "
        +"ct_usuarios u inner join ct_roles r on u.fk_rol = r.pk_rol where u.activo ='1' and u.nombre like '%"+busqueda+"%'", (error, results, field) => {

      // Libera la conexion
      conexion.release();

      if (error){

        return res.status(500).json({
          ok: false,
          mensaje: 'Error al realizar consulta en base de datos',
          errors: error
        });

      }

      // Si todo es correcto responde con el email creado
      res.status(200).json({
        ok: true,
        usuarios: results
      });

    });
    // end qry

  });
  //end pool

});


// ==================================================
//  ELIMINACION LOGICA DE USUARIOS
// ==================================================
app.delete('/:id', mdAutenticacion.verificaToken, ( req, res) =>{

  //Obtiene el id que se envía por path
  var id = req.params.id;

  pool.getConnection( (err,conexion) => {

    // Si ocurre algun error al obtener el hilo de la conexion
    if (err) {
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al obtener conexión con la base de datos',
        errors: err
      });
    }

    var sql = "UPDATE ct_usuarios SET activo='0' WHERE pk_usuario = '"+ id +"'";
    conexion.query(sql, (err, result) =>{

      // Libera la conexion
      conexion.release();

      // Si ocurre algun error al eliminar el usuario
      if (err) {
        return res.status(500).json({
          ok: false,
          mensaje: 'Error al eliminar usuario de base de datos',
          errors: err
        });
      }

      // Si todo es correcto responde las filas afectadas
      res.status(200).json({
        ok: true,
        results: result.affectedRows
      });

    });


  });
  // end pool
});

// ==================================================
//  ACTUALIZAR USUARIO mdAutenticacion.verificaAdminRole_Mismo_Usuario
// ==================================================
app.put('/:id', [mdAutenticacion.verificaToken,mdAutenticacion.verificaAdminRole_Mismo_Usuario ],  ( req, res) =>{

  // Se obtiene el id del path
  var id = req.params.id;

  // Se obtiene el body
  var body = req.body;

  pool.getConnection( (err,conexion) => {

    // Si ocurre algun error al obtener el hilo de la conexion
    if (err) {
      return res.status(500).json({
        ok: false,
        mensajeUsuario: 'Error al establecer comunicación con el servidor de datos, intente más tarde.',
        mensajeTecnico: { errors: err},
        code: '1000'
      });
    }

    if ( body.password != null){
      // Encripta la contraseña
      var password = bcrypt.hashSync(body.password, 10);

      var sql = "UPDATE ct_usuarios SET nombre ='"+body.nombre+"', email='"+body.email+"', password ='"+password
      +"'  WHERE pk_usuario = '"+id+"'";
    }
    else{
      var sql = "UPDATE ct_usuarios SET nombre ='"+body.nombre+"', email='"+body.email+"' WHERE pk_usuario = '"+id+"'";
    }

    conexion.query(sql, (err, result) => {

      // Libera la conexion
      conexion.release();

      // Si ocurre algun error al actualizar el usuario
      if (err) {

        if(err.sqlState=== "23000"){
          return res.status(400).json({
            ok: false,
            mensajeUsuario: 'Error al actualizar usuario, ya existe un usuario con el correo: '+ body.email,
            mensajeTecnico: { errors: { code: err.code, sqlState: err.sqlState, sqlMessage: err.sqlMessage} },
            code: '1001'
          });
        }
        else{
          return res.status(500).json({
            ok: false,
            mensajeUsuario: 'Error al actualizar usuario, intente más tarde.',
            mensajeTecnico: {errors: err},
            code: '1002'
          });
        }
      }

      body.password ='';


      // Si todo es correcto responde las filas afectadas
      res.status(200).json({
        ok: true,
        usuario: body
      });

    });
    // end qry

  });
  // end pool

});

module.exports = app;
