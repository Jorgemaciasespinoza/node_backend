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
var nodemailer = require('nodemailer');

// Pool de conexiones
var pool = require('../config/conexion_db')

// Middlewares valida token
var mdAutenticacion = require('../middlewares/autenticacion');

// Requires Google Sing In
const {OAuth2Client} = require('google-auth-library');
var SEED = require('../config/config').SEED;
var GOOGLE_CLIENT_ID = require('../config/config').GOOGLE_CLIENT_ID;
var GOOGLE_SECRET = require('../config/config').GOOGLE_SECRET;


// ==================================================
// EXPRESS
// ==================================================
// Express para el manejo de las rutas
var app = express();


// ==================================================
// OPERACIONES
// ==================================================

// ==================================================
// RENOVACION DE TOKEN
// ==================================================
app.get('/renuevaToken', mdAutenticacion.verificaToken ,  (req, res) => {

  var object_jwt = {
    usuario: req.usuario,
    menu: req.menu
  }

  // Se crea el token válido por 4 horas
  var token = jwt.sign( object_jwt, SEED, { expiresIn: 14400 } ) // 4 Horas

  res.status(200).json({
    ok: true,
    token: token
  });
});


// ==================================================
// AUTENTICACION TRADICIONAL
// ==================================================
app.post('/', (req, res) => {

  //Se obtiene el body de la peticion
  var body = req.body;

  // Se obtiene un hilo de la conexion
  pool.getConnection( (err,conexion) => {

    if (err) {
      return res.status(500).json({
        ok: false,
        mensajeUsuario: 'Error al establecer comunicación con el servidor de datos, intente más tarde.',
        mensajeTecnico: { errors: err },
        code: '600'
      });
    }

    var query = conexion.query('  select '
        +'u.pk_usuario, '
        +'u.nombre, '
        +'u.email, '
        +'u.password, '
        +'u.imagen, '
        +'r.nombre as rol, '
        +'u.google_auth, '
        +'mi.titulo as titulo_menu, '
        +'mi.icono as icono_titulo, '
        +'mid.titulo as titulo_opcion, '
        +'mid.icono, '
        +'mid.url '
      +'from '
        +'ct_usuarios u inner join ct_roles r on u.fk_rol = r.pk_rol '
        +'inner join ct_menu_item mi on r.pk_rol = mi.fk_rol '
        +'inner join ct_menu_item_det mid on mi.pk_item = mid.fk_menu_item where u.email ="'+body.email+'"',
         (error, results, field) => {

      // Libera la conexion
      conexion.release();

      if (error){
        return res.status(500).json({
          ok: false,
          mensajeUsuario: 'Error en el proceso de lectura de informacón, intente más tarde.',
          mensajeTecnico: { errors: error },
          code: '601'
        });
      }

      if ( results.length === 0 ){
        return res.status(400).json({
          ok: false,
          mensajeUsuario: 'El usuario o contraseña son incorrectos.',
          mensajeTecnico: {},
          code: '602'
        });
      }

      var menu =[]
      var menu_aux =[];

      // Se obtiene el titulo de las opciones del menu sin duplicados
      for (i = 0; i < results.length; i++) {

        // Si no existe el elemento lo agrega
        if (menu.indexOf(results[i].titulo_menu) === -1 ){
          menu.push( results[i].titulo_menu)
        }

      }

      // Se llena el arreglo de menu con sus opciones
      for (i = 0; i < menu.length; i++) {

        //Primero se crea el titulo con un icono vacio y un arreglo vacio de opciones
        menu_aux.push({titulo: menu[i], icono: '', sub: []});
        //Se recorre cada elemento del menu principal
        for (j = 0; j < results.length; j++) {

          //Si el titulo del menu de la fila del qry es igual al titulo de la posicion del arreglo
          //lo agrega los items al arreglo de opciones "sub"
          if (results[j].titulo_menu === menu_aux[i].titulo){

            // Se agrega el icono del titulo del menu
            if (menu_aux[i].icono.length === 0){
              menu_aux[i].icono = results[j].icono_titulo;
            }
            // Se agregan las opciones del submenu
            menu_aux[i].sub.push({titulo_opcion: results[j].titulo_opcion,
              icono: results[j].icono, url: results[j].url});
          }

        }

      }
      // fin del llenado del menu

      var password_db = results[0].password;
      var id_usuario = results[0].pk_usuario;

      // Si el usuario existe se valida la contraseña
      if ( !bcrypt.compareSync( body.password, password_db ) ){

        return res.status(400).json({
          ok: false,
          mensajeUsuario: 'El usuario o contraseña son incorrectos.',
          mensajeTecnico: {},
          code: '603'
        });

      }

      var user = {
        pk_usuario: results[0].pk_usuario,
        nombre: results[0].nombre,
        email: results[0].email,
        imagen: results[0].imagen,
        rol: results[0].rol,
        google_auth: results[0].google_auth
      }

      var object_jwt = {
        usuario: user,
        menu: menu_aux
      }

      // Se crea el token válido por 4 horas
      var token = jwt.sign( object_jwt, SEED, { expiresIn: 14400 } ) // 4 Horas

      // Si todo es correcto manda un 200
      res.status(200).json({
        ok: true,
        id: id_usuario,
        usuario: user,
        token: token
      });

    });
    // qry

  });
  // end pool

});


// ==================================================
// AUTENTICACION POR GOOGLE
// ==================================================
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

     // Se obtiene un hilo de la conexion
     pool.getConnection( (err,conexion) => {

       if (err) {
         return res.status(500).json({
           ok: false,
           mensajeUsuario: 'Error al establecer comunicación con el servidor de datos, intente más tarde.',
           mensajeTecnico: { errors: err },
           code: '604'
         });
       }

       var query = conexion.query('  select '
           +'u.pk_usuario, '
           +'u.nombre, '
           +'u.email, '
           +'u.password, '
           +'u.imagen, '
           +'r.nombre as rol, '
           +'u.google_auth, '
           +'mi.titulo as titulo_menu, '
           +'mi.icono as icono_titulo, '
           +'mid.titulo as titulo_opcion, '
           +'mid.icono, '
           +'mid.url '
         +'from '
           +'ct_usuarios u inner join ct_roles r on u.fk_rol = r.pk_rol '
           +'inner join ct_menu_item mi on r.pk_rol = mi.fk_rol '
           +'inner join ct_menu_item_det mid on mi.pk_item = mid.fk_menu_item where u.email ="'+payload.email+'"',
            (error, results, field) => {

           if (error){
             return res.status(500).json({
               ok: false,
               mensajeUsuario: 'Error en el proceso de lectura de informacón, intente más tarde.',
               mensajeTecnico: { errors: error },
               code: '605'
             });
           }

           // Si el usuario ya esta registrado en base de datos
           if ( results.length != 0 ){

             var menu =[]
             var menu_aux =[];

             // Se obtiene el titulo de las opciones del menu sin duplicados
             for (i = 0; i < results.length; i++) {

               // Si no existe el elemento lo agrega
               if (menu.indexOf(results[i].titulo_menu) === -1 ){
                 menu.push( results[i].titulo_menu)
               }

             }

             // Se llena el arreglo de menu con sus opciones
             for (i = 0; i < menu.length; i++) {

               //Primero se crea el titulo con un icono vacio y un arreglo vacio de opciones
               menu_aux.push({titulo: menu[i], icono: '', sub: []});
               //Se recorre cada elemento del menu principal
               for (j = 0; j < results.length; j++) {

                 //Si el titulo del menu de la fila del qry es igual al titulo de la posicion del arreglo
                 //lo agrega los items al arreglo de opciones "sub"
                 if (results[j].titulo_menu === menu_aux[i].titulo){

                   // Se agrega el icono del titulo del menu
                   if (menu_aux[i].icono.length === 0){
                     menu_aux[i].icono = results[j].icono_titulo;
                   }
                   // Se agregan las opciones del submenu
                   menu_aux[i].sub.push({titulo_opcion: results[j].titulo_opcion,
                     icono: results[j].icono, url: results[j].url});
                 }

               }

             }
             // fin del llenado del menu

             // Si el usuario existe pero se autentico por el metodo tradicional
             if ( results[0].google_auth === '0' ){

               return res.status(400).json({
                 ok: false,
                 mensajeUsuario: 'No puede iniciar sesión con Google intente de la forma tradicional.',
                 mensajeTecnico: { errors: {motivo: 'El usuario fue creado con el método tradicional, no puede iniciar sesión a través de Google' } },
                 code: '606'
               });

             }
             // Si esta registrado en db y se autentico por google
             else{

               var user = {
                 pk_usuario: results[0].pk_usuario,
                 nombre: results[0].nombre,
                 email: results[0].email,
                 imagen: results[0].imagen,
                 rol: results[0].rol,
                 google_auth: results[0].google_auth
               }

               var object_jwt = {
                 usuario: user,
                 menu: menu_aux
               }

               // Se crea el token válido por 4 horas
               var token = jwt.sign( object_jwt, SEED, { expiresIn: 14400 } ) // 4 Horas

               // Si todo es correcto manda un 200
               res.status(200).json({
                 ok: true,
                 usuario: user,
                 id:  results[0].pk_usuario,
                 token: token
               });

             }
             // end else

           }
           // end != 0
           // Si el usuario no existe
           else{

             // Prepara el inset
             var insert = "INSERT INTO ct_usuarios (fk_rol,nombre,email,password,imagen,google_auth) VALUES ?";
             var values = [['1',payload.name,payload.email, ':)',payload.picture, '1']];

             // Ejecuta consulta
             conexion.query(insert, [values], function (err, result) {

               if (err){
                 // Si ocurrre error al realizar insercción retorna 500
                 if (err.sqlState === '23000') {
                   return res.status(400).json({
                     ok: false,
                     mensajeUsuario: 'Error al registrar usuario, ya existe un usuario con el correo: '+ body.email,
                     mensajeTecnico: { errors: {code: err.code, sqlState: err.sqlState, sqlMessage: err.sqlMessage} },
                     code: '607'
                   });
                 }
                 else{
                   return res.status(500).json({
                     ok: false,
                     mensajeUsuario: 'Error al registrar usuario, intente más tarde',
                     mensajeTecnico: {errors: err },
                     code: '608'
                   });
                 }
               }

                 var query2 = conexion.query('  select '
                     +'u.pk_usuario, '
                     +'u.nombre, '
                     +'u.email, '
                     +'u.password, '
                     +'u.imagen, '
                     +'r.nombre as rol, '
                     +'u.google_auth, '
                     +'mi.titulo as titulo_menu, '
                     +'mi.icono as icono_titulo, '
                     +'mid.titulo as titulo_opcion, '
                     +'mid.icono, '
                     +'mid.url '
                   +'from '
                     +'ct_usuarios u inner join ct_roles r on u.fk_rol = r.pk_rol '
                     +'inner join ct_menu_item mi on r.pk_rol = mi.fk_rol '
                     +'inner join ct_menu_item_det mid on mi.pk_item = mid.fk_menu_item where u.email ="'+payload.email+'"',
                      (error2, results2, field2) => {

                     if (error2){
                       return res.status(500).json({
                         ok: false,
                         mensajeUsuario: 'Error en el proceso de lectura de informacón, intente más tarde.',
                         mensajeTecnico: { errors: error2 },
                         code: '609'
                       });
                     }

                     var menu2 =[]
                     var menu_aux2 =[];

                     // Se obtiene el titulo de las opciones del menu sin duplicados
                     for (i = 0; i < results2.length; i++) {

                       // Si no existe el elemento lo agrega
                       if (menu2.indexOf(results2[i].titulo_menu) === -1 ){
                         menu2.push( results2[i].titulo_menu)
                       }

                     }

                     // Se llena el arreglo de menu con sus opciones
                     for (i = 0; i < menu2.length; i++) {

                       //Primero se crea el titulo con un icono vacio y un arreglo vacio de opciones
                       menu_aux2.push({titulo: menu2[i], icono: '', sub: []});
                       //Se recorre cada elemento del menu principal
                       for (j = 0; j < results.length; j++) {

                         //Si el titulo del menu de la fila del qry es igual al titulo de la posicion del arreglo
                         //lo agrega los items al arreglo de opciones "sub"
                         if (results2[j].titulo_menu === menu_aux2[i].titulo){

                           // Se agrega el icono del titulo del menu
                           if (menu_aux2[i].icono.length === 0){
                             menu_aux2[i].icono = results2[j].icono_titulo;
                           }
                           // Se agregan las opciones del submenu
                           menu_aux2[i].sub.push({titulo_opcion: results2[j].titulo_opcion,
                             icono: results2[j].icono, url: results2[j].url});
                         }

                       }

                     }
                     // fin del llenado del menu

                     var user2 = {
                       pk_usuario: results[0].pk_usuario,
                       nombre: results[0].nombre,
                       email: results[0].email,
                       imagen: results[0].imagen,
                       rol: results[0].rol,
                       google_auth: results[0].google_auth
                     }

                     var object_jwt2 = {
                       usuario: user2,
                       menu: menu_aux2
                     }

                     // Se crea el token válido por 4 horas
                     var token2 = jwt.sign( object_jwt2, SEED, { expiresIn: 14400 } ) // 4 Horas

                     // Si todo es correcto manda un 200
                     res.status(200).json({
                       ok: true,
                       usuario: user2,
                       id:  results2[0].pk_usuario,
                       token: token2
                     });


                   });
                   // end qry
                 });
                 // end insert

           }
           // end else
       });
       // end qry que determina si ya existe el usuario
       // Libera la conexion
        conexion.release();
      });
      // end pool

    }).catch(err=> {

     // Si el token no es correcto se envía un 400
     res.status(400).json({
       ok: false,
       mensajeUsuario: 'Error al validar autenticación con Google, intente más tarde.',
       mensajeTecnico: {errors: err },
       code: '610'
     });

   });
   // end ticket

});


// ==================================================
// RECUPERAR CONTRASEÑA
// ==================================================
app.post('/forgot-password', (req, res) => {

  // Se obtiene el body ( email )
  var body = req.body;

  // Se obtiene un hilo de la conexion
  pool.getConnection( (err,conexion) => {

    if (err) {
      return res.status(500).json({
        ok: false,
        mensajeUsuario: 'Error al establecer comunicación con el servidor de datos, intente más tarde.',
        mensajeTecnico: { errors: err },
        code: '800'
      });
    }

    var query = conexion.query("  select "
        +"pk_usuario, "
        +"nombre, "
        +"email, "
        +"imagen, "
        +"nombre as rol, "
        +"google_auth "
      +"from "
        +"ct_usuarios where activo ='1' and email='"+body.email+"'", (error, results, field) => {

      // Libera la conexion
      conexion.release();

      if (error){
        return res.status(500).json({
          ok: false,
          mensajeUsuario: 'Error en el proceso de lectura de informacón, intente más tarde.',
          mensajeTecnico: { errors: error },
          code: '801'
        });
      }

      if (results.length === 0){
        return res.status(400).json({
          ok: false,
          mensajeUsuario: 'Usuario con email: '+ body.email + ' no existe.',
          mensajeTecnico: { errors: {error: 'No existe un usuario especificado' } },
          code: '802'
        });
      }

      var user = {
        pk_usuario: results[0].pk_usuario,
        nombre: results[0].nombre,
        email: results[0].email,
        imagen: results[0].imagen,
        rol: results[0].rol,
        google_auth: results[0].google_auth
      }

      // Se genera el token válido por 15 minutos
      var token = jwt.sign( {usuario: user}, SEED, { expiresIn: 900 } )

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
      // end transporter sendMail

    });
    // end qry

  });
  // end pool

});
// end post


// ==================================================
// ACTUALIZAR CONTRASEÑA
// ==================================================
app.post('/change-password', mdAutenticacion.verificaToken ,(req, res) => {

  // Se obntiene el id del usuario del token
  var id = req.usuario.pk_usuario;

  // Se obtiene la contraseña del body
  var password = req.body.password;

  // Se obtiene un hilo de la conexion
  pool.getConnection( (err,conexion) => {

    if (err) {
      return res.status(500).json({
        ok: false,
        mensajeUsuario: 'Error al establecer comunicación con el servidor de datos, intente más tarde.',
        mensajeTecnico: {errors: err },
        code: '900'
      });
    }

    var query = conexion.query("  select "
        +"pk_usuario, "
        +"nombre, "
        +"email, "
        +"imagen, "
        +"nombre as rol, "
        +"google_auth "
      +"from "
        +"ct_usuarios where activo ='1' and pk_usuario='"+id+"'", (error, results, field) => {

        // Libera la conexion
        conexion.release();

      if (error){
        return res.status(500).json({
          ok: false,
          mensajeUsuario: 'Error en el proceso de lectura de informacón, intente más tarde.',
          mensajeTecnico: {errors: error },
          code: '901'
        });
      }

      if (results.length === 0){
        return res.status(400).json({
          ok: false,
          mensajeUsuario: 'Usuario con email: '+ body.email + ' no existe',
          mensajeTecnico: { errors: { error: 'No existe un usuario especificado'} },
          code: '902'
        });
      }

      var password_encriptada  = bcrypt.hashSync(password, 10);

      var sql = "UPDATE ct_usuarios SET password='"+password_encriptada+"' WHERE pk_usuario = '"+ id +"'";
      conexion.query(sql, (err, result) =>{

        // Si ocurre algun error al actualizar el usuario
        if (err) {
          return res.status(500).json({
            ok: false,
            mensajeUsuario: 'Error al actualizar la contraseña, intente más tarde.',
            mensajeTecnico: {errors: err },
            code: '903'
          });
        }

        // Si todo es correcto responde las filas afectadas
        res.status(200).json({
          ok: true,
          results: result.affectedRows
        });

      });
      // end update

    });
    // end qry

  });
  // end pool
});
// end post

module.exports = app;
