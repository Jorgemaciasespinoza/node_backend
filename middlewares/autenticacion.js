// ==================================================
//  MIDDLEEARE PARA VALIDAR EL TOKEN Y PERMISOS
//  AUTENTICACION.JS
//  Ultima actualización: 16/04/2018
//  Autor: Jorge Macías
// ==================================================


// ==================================================
// REQUIRES
// ==================================================
var jwt = require('jsonwebtoken');
var SEED = require('../config/config').SEED;


// ==================================================
//  VERIFICAR TOKEN
// ==================================================
exports.verificaToken = function ( req, res, next ){

  // Se obtiene el token del query
  var token = req.query.token;

  // Se verifica el token
  jwt.verify( token, SEED, ( err, decoded ) =>{

    // Ocurrio un error al decodificar el token
    if (err){

      return res.status(401).json({
        ok: false,
        mensaje: 'La sesión expiro o no está autorizado para utilizar el recurso solicitado',
        errors: {message: err, code: '601'}
      });

    }

    // se enviar el usuario en la solicitud
    req.usuario = decoded.usuario;

    // Se invoca al next para que continue con las demas operaciones
    next();
  });
}


// ==================================================
//  VERIFICAR ADMIN
// ==================================================
exports.verificaAdminRole = function ( req, res, next ){

  // Se obtiene el usuario que hace la solicitud
  var usuario = req.usuario;

  // Si es un administracion
  if (usuario.role === 'ADMIN_ROLE') {
    next();
    return;
  }
  else{
    // Si no es un administrador no se concede el acceso
    return res.status(401).json({
      ok: false,
      mensaje: 'La sesión expiro o no está autorizado para utilizar el recurso solicitado',
      errors: {message: 'No es administrador', code: '602'}
    });

  }
}


// ==================================================
//  VERIFICAR ADMIN O MISMO USUARIO
// ==================================================
exports.verificaAdminRole_Mismo_Usuario = function ( req, res, next ){

  // Se obtiene el usuario de la solicitud
  var usuario = req.usuario;

  //Se obtiene el usuario a actualizar
  var id = req.params.id;

  // Si es un usuario administrador o si mismo se puede actualizar
  if (usuario.role === 'ADMIN_ROLE' || usuario._id === id) {
    next();
    return;
  }
  else{

    //
    return res.status(401).json({
      ok: false,
      mensaje: 'La sesión expiro o no está autorizado para utilizar el recurso solicitado',
      errors: {message: 'No permitido', code: '603'}
    });

  }
}
