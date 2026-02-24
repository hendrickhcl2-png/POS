// ==================== BARCODE SCANNER (laser/USB) ====================
// Physical barcode scanners act as keyboards: they type the code and send Enter.
// The button just focuses the right field + shows a visual "ready" state.
// The Enter key from the scanner is intercepted so it doesn't submit the form.

const BarcodeScanner = {
  escanear(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const prev = field.placeholder;
    field.focus();
    field.classList.add("scanning-mode");
    field.placeholder = "Listo — escanee el código...";

    const onEnter = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      field.classList.remove("scanning-mode");
      field.placeholder = prev;
      field.removeEventListener("keydown", onEnter);
      field.removeEventListener("blur", onBlur);
      // Move to next field after scanning
      const siguiente = document.getElementById("productoNombre");
      if (siguiente && siguiente.value === "") siguiente.focus();
    };

    const onBlur = () => {
      field.classList.remove("scanning-mode");
      field.placeholder = prev;
      field.removeEventListener("keydown", onEnter);
    };

    field.addEventListener("keydown", onEnter);
    field.addEventListener("blur", onBlur, { once: true });
  },
};

window.BarcodeScanner = BarcodeScanner;
