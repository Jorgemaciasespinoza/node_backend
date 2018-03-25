var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');


// CORREO ELECTRONICO
var nodemailer = require('nodemailer');

const {OAuth2Client} = require('google-auth-library');


var SEED = require('../config/config').SEED;

var GOOGLE_CLIENT_ID = require('../config/config').GOOGLE_CLIENT_ID;
var GOOGLE_SECRET = require('../config/config').GOOGLE_SECRET;


var app = express();


var Usuario = require('../models/usuario');


// ======================================
//  AUTENTICACION NORMAL
// ======================================
app.post('/', (req, res) => {

  var body = req.body;

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
        mensaje: 'Usuario con id: '+ id + 'no existe',
        errors: { message: 'No existe un usuario especificado'}
      });
    }

    // Si el usuario existe se valida la contraseña
    if ( !bcrypt.compareSync( body.password, usuarioDB.password ) ){
      return res.status(400).json({
        ok: false,
        mensaje: 'Credenciales incorrectas',
        errors: { message: 'Error en la autenticación'}
      });
    }

    usuarioDB.password = ':)';

    // Aqui se debe crear el token
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


// ======================================
//  AUTENTICACION GOOGLE
// ======================================
app.post('/google', (req, res) => {

  var token = req.body.token;

  const oAuth2Client = new OAuth2Client(
     GOOGLE_CLIENT_ID,
     GOOGLE_SECRET
   );

   const tiket = oAuth2Client.verifyIdToken({
     idToken: token
     //audience: GOOGLE_CLIENT_ID
   });

   tiket.then(data =>{

     var payload = data.payload;

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
             mensaje: 'Debe autenticarse de forma normal'
           });
         }
         // Si existe y fue autenticado por Google se crea el token y se envía
         else {
           usuario.password = ':)';

           // Aqui se debe crear el token
           var token = jwt.sign( {usuario: usuario}, SEED, { expiresIn: 14400 } ) // 4 Horas

           res.status(200).json({
             ok: true,
             usuario: usuario,
             token: token,
             id: usuario._id,
           });

         }
       }
       // El usuario no existe
       else{

         var usuario = new Usuario();

         usuario.nombre = payload.name;
         usuario.email = payload.email;
         usuario.password = ':)';
         usuario.img = payload.picture;
         usuario.google =  true;

         usuario.save( (err, usuarioDB) => {

           if ( err ){
             return res.status(500).json({
               ok: false,
               mensaje: 'Error al registrar usuario en base de datos',
               errors: err
             });
           }

           usuario.password = ':)';

           // Aqui se debe crear el token
           var token = jwt.sign( {usuario: usuarioDB}, SEED, { expiresIn: 14400 } ) // 4 Horas

           res.status(200).json({
             ok: true,
             usuario: usuarioDB,
             token: token,
             id: usuarioDB._id,
           });

         });


       }

     });



   }).catch(err=> {

     res.status(400).json({
       ok: false,
       mensaje: 'El token es inválido',
       errors: err
     });

   });

});


// ======================================
//  ENVIO DE CORREO
// ======================================
app.get('/correo', (req, res) => {

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: '12240580@itleon.edu.mx',
      pass: 'codigoartesanal'
    }
  });

var mailOptions = {
  from: '12240580@itleon.edu.mx',
  to: 'deon.arte@gmail.com',
  subject: 'Sending Email using Node.js',
  text: 'That was easy!'
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    res.status(200).json({
      ok: true,
      mensaje: 'Correcto'
    });
  }
});

});


module.exports = app;
