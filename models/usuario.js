// ==================================================
//  MODELO: USUARIO
//  Ultima actualización: 28/03/2018
//  Autor: Jorge Macías
// ==================================================


// ==================================================
// REQUIRES
// ==================================================
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');


// ==================================================
// FILTROS
// ==================================================
var rolesValidos = {
  values: ['ADMIN_ROLE', 'USER_ROLE'],
  message: '{VALUE} no es un rol permitido'
}


// ==================================================
// INICIAR SCHEMA
// ==================================================
var Schema = mongoose.Schema;

var usuarioSchema = new Schema({
  nombre: { type: String, required: [true, 'El nombre es requerido'] },
  email: { type: String, unique: true, required: [true, 'El correo es requerido'] },
  password: { type: String, required: [true, 'La contraseña es requerida'] },
  img: { type: String, required: false },
  role: { type: String, required: true, default: 'USER_ROLE' , enum: rolesValidos },
  google: { type: Boolean, required: true, default: false }
})


// ==================================================
// APLICAR VALIDACIONES
// ==================================================
usuarioSchema.plugin(uniqueValidator, { message: '{PATH} debe ser único' });


// ==================================================
// EXPORTAR MODELO
// ==================================================
module.exports = mongoose.model('Usuario', usuarioSchema);
