// ==================================================
//  OPERACIONES SUBIR ARCHIVOS
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
      mensaje: 'El tipo no es válido',
      errors: { message: 'El tipo no es valido' }
    });

  }

  // Obtener el id del path
  var id = req.params.id;

  // Validar si en la petición viene un archivo
  if ( !req.files ){

    return res.status(400).json({
      ok: false,
      mensaje: 'No se seleciono ningún archivo',
      errors: { message: 'Debe seleccionar un archivo' }
    });

  }

  // Obtener el nombre del archivo
  var archivo = req.files.imagen;

  // Se separa el nombre por partes separadas por puntos
  var nombreImagen = archivo.name.split('.');

  // Se obtiene la última parte del nombre que corresponde a la extensión
  var extensionArchivo = nombreImagen[ nombreImagen.length -1  ];

  // arreglo de extensiones permitidas
  var extensionesPermitidas = [ 'png', 'jpg', 'gif', 'jpeg' ];

  // Se valida si la extensión es valida
  if ( extensionesPermitidas.indexOf ( extensionArchivo ) < 0 ){

    return res.status(400).json({
      ok: false,
      mensaje: 'Extensión no válida',
      errors: { message: 'Las extenciones válidas son: ' + extensionesPermitidas.join(', ') }
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
        mensaje: 'Error al mover archivo',
        errors: err
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

    Usuario.findById(id, (err, usuario) => {

      if ( err ){

        return res.status(400).json({
          ok: false,
          mensaje: 'Error al encontrar usuario',
          errors: err
        });

      }

      // Revisar si ya tiene una imagen asignada
      var pathAnterior = './uploads/usuarios/' + usuario.img;

      if ( fs.existsSync( pathAnterior )){
        fs.unlink( pathAnterior ); // Elimina la imagen anterior
      }

      // Guardar la nueva imagen
      usuario.img = nombreArchivo;

      usuario.save( ( err, usuarioActualizado ) => {

        // Si ocurre un arror al grabar usuario
        if ( err ){

          return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualiza la imagen en base dartos',
            errors: err
          });

        }

        // Si todo sale bien
        return res.status(200).json({
          ok: true,
          mensaje: 'Imagen grabada',
          usuario: usuarioActualizado
        });

      });
      // end save
    });
    // end findById
  }
  // end if usuario
}

module.exports = app;
