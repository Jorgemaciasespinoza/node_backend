// ==================================================
//  OPERACIONES SUBIR ARCHIVOS
//  UPLOAD.JS
//  Ultima actualización: 28/03/2018
//  Autor: Jorge Macías
// ==================================================


// ==================================================
// REQUIRE
// ==================================================
var express = require('express');

// Se agrega el modelo del usuario
var Usuario = require('../models/usuario');

// Manejo de archivos
var fileUpload = require('express-fileupload');

// Realizar operaciones con archivos
var fs = require('fs');

// Pool de conexiones
var pool = require('../config/conexion_db')

// ========================
// EXPRESS
// ========================
// Express para el manejo de las rutas
var app = express();



// ==================================================
// OPERACIONES
// ==================================================


// ========================
// MIDDLEWARE PARA EL MANEJO DE LOS ARCHIVOS
// ========================
app.use(fileUpload());


// ========================
// OPERACION PARA SUBIR IMAGEN AL SERVIDOR
// ========================
app.put('/:tipo/:id', (req, res) => {

  // Obtener el tipo del path
  var tipo = req.params.tipo;

  // Tipos validos
  var tiposValidos = [ 'usuarios' ];

  // Validación de tipo
  if (  tiposValidos.indexOf ( tipo ) < 0 ){

    return res.status(400).json({
      ok: false,
      mensajeUsuario: 'La clasificación de la imagen es incorrecta.',
      mensajeTecnico: {errors: {error: 'El tipo es inválido.'}},
      code: '2000'
    });

  }

  // Obtener el id del path
  var id = req.params.id;

  // Validar si en la petición viene un archivo
  if ( !req.files ){

    return res.status(400).json({
      ok: false,
      mensajeUsuario: 'No se seleciono ningún archivo.',
      mensajeTecnico: { errors: {error: 'Debe subir un archivo.'} },
      code: '2001'
    });

  }

  // Obtener el nombre del archivo
  var archivo = req.files.imagen;

  // Se separa el nombre por partes separadas por puntos
  var nombreImagen = archivo.name.split('.');

  // Se obtiene la última parte del nombre que corresponde a la extensión
  var extensionArchivo = nombreImagen[ nombreImagen.length -1  ];

  // arreglo de extensiones permitidas
  var extensionesPermitidas = [ 'png', 'jpg', 'gif', 'jpeg', 'PNG','JPG','GIF','JPEG' ];

  // Se valida si la extensión es valida
  if ( extensionesPermitidas.indexOf ( extensionArchivo ) < 0 ){

    return res.status(400).json({
      ok: false,
      mensajeUsuario: 'La extensión de la imagen no es válida.',
      mensajeTecnico: { errors: {error: 'Las extenciones válidas son: ' + extensionesPermitidas.join(', ') } },
      code: '2002'
    });

  }

  // Se cambia el nombre a uno personalizado
  // Formato id usuario - numero random . extensión
  var nombreArchivo = `${ id }-${ new Date().getMilliseconds() }.${extensionArchivo}`;

  // Mover el archivo a una dirección especifica
  //var path = `./uploads/${ tipo }/${ nombreArchivo }`;

  var path = './uploads/'+ tipo + '/' + nombreArchivo;

  archivo.mv( path, err => {

    if ( err ){

      return res.status(500).json({
        ok: false,
        mensajeUsuario: 'Error al almacenar imagen.',
        mensajeTecnico: {errors: {error: 'No se pudo mover imagen al directorio.', descripcion: err }},
        code: '2003'
      });

    }

    subirPorTipo( tipo, id, nombreArchivo, res );

  });

});



// ==================================================
// FUNCIONES
// ==================================================


// ========================
// FUNCION PARA GUARDAR Y ACTUALIZAR LA IMAGEN DE USUARIO EN BD
// ========================
function subirPorTipo( tipo, id, nombreArchivo, res ){

  if ( tipo === 'usuarios' ){

    // Se obtiene un hilo de la conexion
    pool.getConnection( (err,conexion) => {

      if (err) {
        return res.status(500).json({
          ok: false,
          mensajeUsuario: 'Error al establecer comunicación con el servidor de datos, intente más tarde.',
          mensajeTecnico: { errors: err},
          code: '2004'
        });
      }

      var query = conexion.query("  select "
          +"u.pk_usuario, "
          +"u.nombre, "
          +"u.email, "
          +"u.imagen, "
          +"u.google_auth "
        +"from "
          +"ct_usuarios u where u.activo ='1' and u.pk_usuario='"+id+"'",
          (error, results, field) => {

          if (error){
            return res.status(500).json({
              ok: false,
              mensajeUsuario: 'Error en el proceso de lectura de información, intente más tarde.',
              mensajeTecnico: { errors: error },
              code: '2005'
            });
          }

          if (results.length === 0){
            return res.status(400).json({
              ok: false,
              mensajeUsuario: 'Usuario con id: '+ id + ' no existe.',
              mensajeTecnico: { errors: {error: 'No existe un usuario especificado' } },
              code: '2006'
            });
          }

          // Revisar si ya tiene una imagen asignada
          var pathAnterior = './uploads/usuarios/' + results[0].imagen;

          if ( fs.existsSync( pathAnterior )){
            fs.unlink( pathAnterior ); // Elimina la imagen anterior
          }

          var sql = "UPDATE ct_usuarios SET imagen='"+nombreArchivo+"' WHERE pk_usuario = '"+ id +"'";
          conexion.query(sql, (err, result) =>{

            // Si ocurre algun error al actualizar el usuario
            if (err) {
              return res.status(500).json({
                ok: false,
                mensajeUsuario: 'Error al actualizar la imagen, intente más tarde.',
                mensajeTecnico: {errors: err },
                code: '2007'
              });
            }

            // Si todo sale bien
            return res.status(200).json({
              ok: true,
              mensaje: 'Imagen grabada',
              imagen: nombreArchivo
            });

          });
          // end UPDATE

        });
        // end qry

        // Libera la conexion
        conexion.release();
      });
      // end pool
  }
  // end if usuario
}

module.exports = app;
