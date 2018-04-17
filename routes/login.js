// ==================================================
//  OPERACIONES PARA EL MANEJO DE USUARIOS
//  LOGIN.JS
//  Ultima actualización: 16/04/2018
//  Autor: Jorge Macías
// ==================================================



// ==================================================
// REQUIRES
// ==================================================

var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

// Middlewares valida token
var mdAutenticacion = require('../middlewares/autenticacion');

// CORREO ELECTRONICO
var nodemailer = require('nodemailer');


// Requires Google Sing In
const {OAuth2Client} = require('google-auth-library');

var SEED = require('../config/config').SEED;

var GOOGLE_CLIENT_ID = require('../config/config').GOOGLE_CLIENT_ID;
var GOOGLE_SECRET = require('../config/config').GOOGLE_SECRET;

// Se agrega el modelo del usuario
var Usuario = require('../models/usuario');


// ========================
// EXPRESS
// ========================

// Express para el manejo de las rutas
var app = express();


// ==================================================
// OPERACIONES
// ==================================================


// ========================
// AUTENTICACION TRADICIONAL
// ========================
app.post('/', (req, res) => {

  // Se obtiene el body de la peticion
  var body = req.body;

  // Se obtiene solo un usuario
  Usuario.findOne({ email: body.email }, ( err, usuarioDB ) => {

    // Ocurrio un error al obtener el usuario
    if (err){
      return res.status(500).json({
        ok: false,
        mensaje: 'Error al obtener el usuario',
        errors: err
      });
    }

    // Si el usuario no existe retorna un 400
    if ( !usuarioDB ){
      return res.status(400).json({
        ok: false,
        mensaje: 'Usuario: '+ body.email + ' no existe',
        errors: { message: 'No existe un usuario especificado'}
      });
    }

    // Si el usuario existe se valida la contraseña
    if ( !bcrypt.compareSync( body.password, usuarioDB.password ) ){
      return res.status(400).json({
        ok: false,
        mensaje: 'El usuario o contraseña son incorrectos',
        errors: { message: 'Error en la autenticación'}
      });
    }

    // Se establece una contraseña falsa
    usuarioDB.password = ':)';

    // Se crea el token válido por 4 horas
    var token = jwt.sign( {usuario: usuarioDB}, SEED, { expiresIn: 14400 } ) // 4 Horas

    // Si todo es correcto manda un 200
    res.status(200).json({
      ok: true,
      usuario: usuarioDB,
      token: token,
      id: usuarioDB._id,
    });

  });
  // end findOne
});


// ========================
// AUTENTICACION POR GOOGLE
// ========================
app.post('/google', (req, res) => {

  // Se obtiene el token del body
  var token = req.body.token;

  // Se crea el cliente para validar el token
  const oAuth2Client = new OAuth2Client(
     GOOGLE_CLIENT_ID,
     GOOGLE_SECRET
   );

   // Se verifica el token
   const tiket = oAuth2Client.verifyIdToken({
     idToken: token
     //audience: GOOGLE_CLIENT_ID
   });


   tiket.then(data =>{

     // Si todo es correcto se obtiene el payload
     var payload = data.payload;

     // Se busca el usuario para determinar si se debe registrar
     Usuario.findOne( {email: payload.email }, (err, usuario) =>{

       // Si ocurre algun error al leer el usuario
       if ( err ){

         return res.status(500).json({
           ok: false,
           mensaje: 'Error al leer el usuario en base de datos',
           errors: err
         });

       }

       // Si el usuario existe
       if ( usuario ){

         // Si el usuario no fue autenticado por google envia 400 para
         // que se autentifique por el metodo normal
         if ( !usuario.google ){

           return res.status(400).json({
             ok: false,
             mensaje: 'Debe autenticarse de forma tradicional'
           });

         }
         // Si existe y fue autenticado por Google se crea el token y se envía
         else {

           usuario.password = ':)';

           // Se crea el token válido por 4 horas
           var token = jwt.sign( {usuario: usuario}, SEED, { expiresIn: 14400 } ) // 4 Horas

           // Se responde con el usuario y el token generado
           res.status(200).json({
             ok: true,
             usuario: usuario,
             token: token,
             id: usuario._id,
           });

         }
       }

       // Si el usuario no existe en base de datos (Es la primer vez que se autentica port Google)
       // Se registra usuario en base de datos
       else{

         var usuario = new Usuario();

         usuario.nombre = payload.name;
         usuario.email = payload.email;
         usuario.password = ':)';
         usuario.img = payload.picture;
         usuario.google =  true;

         // Se registra usuario
         usuario.save( (err, usuarioDB) => {

           if ( err ){

             // Si ocurre algún error al grabar usuario envía un 500
             return res.status(500).json({
               ok: false,
               mensaje: 'Error al registrar usuario en base de datos',
               errors: err
             });

           }

           usuario.password = ':)';

           // Se crea el token válido por 4 horas
           var token = jwt.sign( {usuario: usuarioDB}, SEED, { expiresIn: 14400 } ) // 4 Horas

           // Se responde con un 200 con el token y el usuario
           res.status(200).json({
             ok: true,
             usuario: usuarioDB,
             token: token,
             id: usuarioDB._id,
           });

         });
         // end save


       }

     });
     // end findOne
   }).catch(err=> {

     // Si el token no es correcto se envía un 400
     res.status(400).json({
       ok: false,
       mensaje: 'El token es inválido',
       errors: err
     });

   });

});


// ========================
// RECUPERAR CONTRASEÑA
// ========================
app.post('/forgot-password', (req, res) => {

  // Se obtiene el body ( email )
  var body = req.body;

  // Se busca usuario en base de datos
  Usuario.findOne({ email: body.email }, ( err, usuarioDB ) => {

    // Ocurrio un error al obtener el usuario
    if (err){

      return res.status(500).json({
        ok: false,
        mensaje: 'Error al obtener el usuario',
        errors: err
      });

    }

    // Si el usuario no existe retorna un 400
    if ( !usuarioDB ){

      return res.status(400).json({
        ok: false,
        mensaje: 'Usuario con email: '+ body.email + ' no existe',
        errors: { message: 'No existe un usuario especificado'}
      });

    }

    // Se genera el token válido por 15 minutos
    var token = jwt.sign( {usuario: usuarioDB}, SEED, { expiresIn: 900 } )

    // Se prepara información para el envío del token a través del correo
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: '12240580@itleon.edu.mx',
        pass: 'codigoartesanal'
      }
    });

    var mailOptions = {
      from: '12240580@itleon.edu.mx',
      to: body.email,
      subject: 'Recuperación de contraseña',
      text: 'Para cambiar la contraseña ingresa a esta dirección: \n\n\nhttp://localhost:4200/#/password-reset/'+token
    };

    transporter.sendMail(mailOptions, function(error, info){
      if ( error ) {
        // Si falla el envío
        return res.status(400).json({
          ok: false,
          mensaje: 'No se puedieron enviar instrucciones al correo: '+ body.email,
          errors: error
        });

      }
      else {

        res.status(200).json({
          ok: true,
          mensaje: 'Correcto'
        });

      }
    });

  });
  // end findOne

});

// ========================
// ACTUALIZAR CONTRASEÑA
// ========================
app.post('/change-password', mdAutenticacion.verificaToken ,(req, res) => {

  // Se obntiene el id del usuario del token
  var id = req.usuario._id;

  // Se obtiene la contraseña del body
  var password = req.body.password;

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
    usuario.password  = bcrypt.hashSync(password, 10);

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

      // Se establece contraseña falsa
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

module.exports = app;
