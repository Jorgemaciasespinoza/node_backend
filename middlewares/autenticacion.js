var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;


// ======================================
//  VERIFICAR TOKEN
// ======================================
exports.verificaToken = function ( req, res, next ){

  // Se obtiene el token del query
  var token = req.query.token;

  // Aqui se valida el token
  jwt.verify( token, SEED, ( err, decoded ) =>{

    // Ocurrio un error al decodificar el token
    if (err){
      return res.status(401).json({
        ok: false,
        mensaje: 'Token incorrecto',
        errors: err
      });
    }

    req.usuario = decoded.usuario;

    // Se invoca al next para que continue con las demas operaciones
    next();

  });

}
