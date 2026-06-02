"""Validadores reutilizables para modelos del ERP Snabbit."""

from django.core.exceptions import ValidationError


def validate_rut_chileno(value: str) -> None:
    """Valida formato y digito verificador de RUT chileno (Modulo 11).

    Acepta formatos: '12345678-9', '12.345.678-9', '12345678K'.
    Lanza ValidationError si el RUT es invalido.
    """
    if not value:
        return

    # Normalizar: eliminar puntos y guion
    clean = value.replace(".", "").replace("-", "").strip().upper()

    if len(clean) < 2:
        raise ValidationError("RUT invalido: demasiado corto.")

    rut_body = clean[:-1]
    dv_ingresado = clean[-1]

    if not rut_body.isdigit():
        raise ValidationError("RUT invalido: el cuerpo debe contener solo digitos.")

    rut_num = int(rut_body)

    # Calcular digito verificador con Modulo 11
    secuencia = [2, 3, 4, 5, 6, 7]
    suma = 0
    for i, digito in enumerate(reversed(str(rut_num))):
        suma += int(digito) * secuencia[i % len(secuencia)]

    resto = 11 - (suma % 11)
    if resto == 11:
        dv_esperado = "0"
    elif resto == 10:
        dv_esperado = "K"
    else:
        dv_esperado = str(resto)

    if dv_ingresado != dv_esperado:
        raise ValidationError(
            f"RUT invalido: el digito verificador '{dv_ingresado}' no corresponde (esperado: '{dv_esperado}')."
        )
