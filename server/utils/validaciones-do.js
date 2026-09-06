// ==================== VALIDACIONES DE FORMATO (RD) ====================
// Espejo en el backend de public/js/utils/validators.js. Las reglas deben
// coincidir con las del frontend: si la pantalla rechaza un valor, la API
// también, y al revés.

const soloDigitos = (valor) => String(valor).replace(/\D/g, "");

// Cédula dominicana: 11 dígitos (acepta guiones)
function esCedula(valor) {
  return soloDigitos(valor).length === 11;
}

// RNC dominicano: 9 dígitos (acepta guiones)
function esRNC(valor) {
  return soloDigitos(valor).length === 9;
}

// Teléfono dominicano: 10 dígitos
function esTelefono(valor) {
  return soloDigitos(valor).length === 10;
}

function esEmail(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim());
}

// Valida los campos de contacto que vengan informados y devuelve el primer
// mensaje de error, o null si todo está bien. Los campos vacíos se omiten:
// son opcionales, solo se exige que lo que se escriba tenga formato válido.
function validarContacto({ cedula, rnc, telefono, email }) {
  const reglas = [
    [cedula, esCedula, "La cédula debe tener 11 dígitos"],
    [rnc, esRNC, "El RNC debe tener 9 dígitos"],
    [telefono, esTelefono, "El teléfono debe tener 10 dígitos"],
    [email, esEmail, "El correo electrónico no tiene un formato válido"],
  ];

  for (const [valor, comprueba, mensaje] of reglas) {
    if (valor === undefined || valor === null || String(valor).trim() === "") continue;
    if (!comprueba(valor)) return mensaje;
  }
  return null;
}

module.exports = { esCedula, esRNC, esTelefono, esEmail, validarContacto };
