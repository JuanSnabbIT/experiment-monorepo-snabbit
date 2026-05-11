from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


MONEDA_COTIZACION_MAP = {
    "1": "USD",
    "2": "CLP",
    "3": "UF",
}

CUANTIZACION_POR_MONEDA = {
    "CLP": Decimal("0.01"),
    "USD": Decimal("0.01"),
    "UF": Decimal("0.01"),
}

FORMAS_PAGO_VENTA_VALIDAS = {"contado", "cuotas"}
FORMAS_PAGO_VENTA_LEGACY = {
    "pago_unico": "contado",
    "mensual": "cuotas",
    "anual": "cuotas",
}
HITO_PAGO_VENTA_LABELS = {
    "inicio": "Inicio",
    "entrega_intermedia": "Entrega intermedia",
    "entrega_final": "Entrega final",
    "personalizado": "Personalizado",
}


def _to_decimal(value):
    if isinstance(value, Decimal):
        return value
    if value in (None, ""):
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def normalizar_moneda(value):
    if value in MONEDA_COTIZACION_MAP:
        return MONEDA_COTIZACION_MAP[value]
    if value in CUANTIZACION_POR_MONEDA:
        return value
    raise ValueError("Moneda no soportada para conversion contractual.")


def cuantizar_monto(value, moneda):
    monto = _to_decimal(value)
    moneda_normalizada = normalizar_moneda(moneda)
    quantum = CUANTIZACION_POR_MONEDA.get(moneda_normalizada, Decimal("0.01"))
    return monto.quantize(quantum, rounding=ROUND_HALF_UP)


def _to_clean_string(value):
    if value is None:
        return ""
    return str(value).strip()


def _inferir_hito_pago_tipo(index, total_cuotas):
    if total_cuotas <= 1 or index == 1:
        return "inicio"
    if index == total_cuotas:
        return "entrega_final"
    return "entrega_intermedia"


def _normalizar_hito_pago_venta(cuota, *, index, total_cuotas, require_hitos=False):
    hito_pago_tipo = _to_clean_string(cuota.get("hito_pago_tipo"))
    hito_pago_descripcion = _to_clean_string(cuota.get("hito_pago_descripcion"))

    if not hito_pago_tipo:
        if require_hitos:
            raise ValueError("Cada cuota debe indicar un hito de pago.")
        hito_pago_tipo = _inferir_hito_pago_tipo(index, total_cuotas)

    if hito_pago_tipo not in HITO_PAGO_VENTA_LABELS:
        raise ValueError("Cada cuota debe indicar un hito de pago valido.")

    if hito_pago_tipo == "personalizado":
        if not hito_pago_descripcion:
            raise ValueError(
                "Las cuotas con hito personalizado deben indicar una descripcion."
            )
        return hito_pago_tipo, hito_pago_descripcion

    return hito_pago_tipo, hito_pago_descripcion or HITO_PAGO_VENTA_LABELS[hito_pago_tipo]


def resolver_forma_pago_venta(
    contrato=None,
    *,
    forma_pago_venta=None,
    forma_pago_contractual=None,
):
    forma = forma_pago_venta
    if forma is None and contrato is not None:
        forma = getattr(contrato, "forma_pago_venta", None)
    if forma in FORMAS_PAGO_VENTA_VALIDAS:
        return forma

    forma_legacy = forma_pago_contractual
    if forma_legacy is None and contrato is not None:
        forma_legacy = getattr(contrato, "forma_pago_contractual", None)
    return FORMAS_PAGO_VENTA_LEGACY.get(forma_legacy, "contado")


def normalizar_cuotas_venta(cuotas, *, require_hitos=False):
    cuotas_normalizadas = []
    cuotas_base = cuotas or []
    total_cuotas = len(cuotas_base)
    for index, cuota in enumerate(cuotas_base, start=1):
        if not isinstance(cuota, dict):
            raise ValueError("Cada cuota debe enviarse como un objeto.")
        orden = cuota.get("orden", index)
        porcentaje = cuota.get("porcentaje")
        if porcentaje in (None, ""):
            raise ValueError("Cada cuota debe indicar porcentaje.")
        try:
            orden_normalizado = int(orden)
        except (TypeError, ValueError):
            raise ValueError("Cada cuota debe indicar un orden valido.") from None
        porcentaje_normalizado = _to_decimal(porcentaje)
        hito_pago_tipo, hito_pago_descripcion = _normalizar_hito_pago_venta(
            cuota,
            index=index,
            total_cuotas=total_cuotas,
            require_hitos=require_hitos,
        )
        cuotas_normalizadas.append(
            {
                "orden": orden_normalizado,
                "porcentaje": float(
                    porcentaje_normalizado.quantize(
                        Decimal("0.01"),
                        rounding=ROUND_HALF_UP,
                    )
                ),
                "hito_pago_tipo": hito_pago_tipo,
                "hito_pago_descripcion": hito_pago_descripcion,
            }
        )
    return sorted(cuotas_normalizadas, key=lambda cuota: cuota["orden"])


def resolver_cuotas_venta(
    contrato=None,
    *,
    forma_pago_venta=None,
    cuotas_venta=None,
    forma_pago_contractual=None,
    strict=False,
    require_hitos=False,
):
    forma = resolver_forma_pago_venta(
        contrato,
        forma_pago_venta=forma_pago_venta,
        forma_pago_contractual=forma_pago_contractual,
    )
    cuotas_base = cuotas_venta
    if cuotas_base is None and contrato is not None:
        cuotas_base = getattr(contrato, "cuotas_venta", None)

    cuotas_normalizadas = normalizar_cuotas_venta(
        cuotas_base,
        require_hitos=require_hitos,
    )

    if forma == "contado":
        if strict and cuotas_normalizadas:
            raise ValueError("El pago contado no admite cuotas configuradas.")
        return []

    if not cuotas_normalizadas:
        forma_legacy = forma_pago_contractual
        if forma_legacy is None and contrato is not None:
            forma_legacy = getattr(contrato, "forma_pago_contractual", None)
        if strict and forma_legacy not in {"mensual", "anual"}:
            raise ValueError(
                "Debe definir al menos una cuota para contratos de venta con pago en cuotas."
            )
        return [
            {
                "orden": 1,
                "porcentaje": 100.0,
                "hito_pago_tipo": "inicio",
                "hito_pago_descripcion": HITO_PAGO_VENTA_LABELS["inicio"],
            }
        ]

    porcentajes = [_to_decimal(cuota["porcentaje"]) for cuota in cuotas_normalizadas]
    if any(porcentaje <= 0 for porcentaje in porcentajes):
        raise ValueError("Todos los porcentajes de cuotas deben ser mayores que cero.")
    total_porcentaje = sum(porcentajes, Decimal("0")).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    if total_porcentaje != Decimal("100.00"):
        raise ValueError("La suma de porcentajes de cuotas debe ser exactamente 100.")

    return cuotas_normalizadas


def construir_resumen_cuotas_venta_por_moneda(total_contrato, moneda, cuotas_venta):
    total_decimal = _to_decimal(total_contrato)
    cuotas = []
    for cuota in cuotas_venta or []:
        porcentaje = _to_decimal(cuota.get("porcentaje"))
        monto = cuantizar_monto((total_decimal * porcentaje) / Decimal("100"), moneda)
        cuotas.append(
            {
                "orden": int(cuota.get("orden") or len(cuotas) + 1),
                "porcentaje": float(
                    porcentaje.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                ),
                "monto": float(monto),
                "hito_pago_tipo": cuota.get("hito_pago_tipo"),
                "hito_pago_descripcion": cuota.get("hito_pago_descripcion")
                or HITO_PAGO_VENTA_LABELS.get(cuota.get("hito_pago_tipo"), ""),
                "hito_pago_label": cuota.get("hito_pago_descripcion")
                or HITO_PAGO_VENTA_LABELS.get(cuota.get("hito_pago_tipo"), ""),
            }
        )
    return cuotas


def convertir_monto_cotizacion(
    monto,
    *,
    moneda_origen,
    moneda_destino,
    dolar_observado=None,
    valor_uf=None,
):
    origen = normalizar_moneda(moneda_origen)
    destino = normalizar_moneda(moneda_destino)
    amount = _to_decimal(monto)

    if origen == destino:
        return cuantizar_monto(amount, destino)

    tasa_usd = _to_decimal(dolar_observado)
    tasa_uf = _to_decimal(valor_uf)

    if origen == "CLP":
        monto_clp = amount
    elif origen == "USD":
        if tasa_usd <= 0:
            raise ValueError("No existe dolar_observado valido para convertir desde USD.")
        monto_clp = amount * tasa_usd
    elif origen == "UF":
        if tasa_uf <= 0:
            raise ValueError("No existe valor_uf valido para convertir desde UF.")
        monto_clp = amount * tasa_uf
    else:
        raise ValueError("Moneda de origen no soportada.")

    if destino == "CLP":
        return cuantizar_monto(monto_clp, destino)
    if destino == "USD":
        if tasa_usd <= 0:
            raise ValueError("No existe dolar_observado valido para convertir a USD.")
        return cuantizar_monto(monto_clp / tasa_usd, destino)
    if destino == "UF":
        if tasa_uf <= 0:
            raise ValueError("No existe valor_uf valido para convertir a UF.")
        return cuantizar_monto(monto_clp / tasa_uf, destino)
    raise ValueError("Moneda de destino no soportada.")


def calcular_total_convertido_cotizacion(cotizacion, moneda_destino):
    total_origen = _to_decimal(getattr(cotizacion, "calcular_total_estimado", 0))
    return convertir_monto_cotizacion(
        total_origen,
        moneda_origen=getattr(cotizacion, "tipo_moneda", None),
        moneda_destino=moneda_destino,
        dolar_observado=getattr(cotizacion, "dolar_observado", None),
        valor_uf=getattr(cotizacion, "valor_uf", None),
    )


def obtener_errores_conversion_cotizaciones(cotizaciones, moneda_destino):
    errores = []
    for cotizacion in cotizaciones:
        try:
            calcular_total_convertido_cotizacion(cotizacion, moneda_destino)
        except ValueError as exc:
            numero = getattr(cotizacion, "numero_cotizacion", None) or getattr(cotizacion, "id", "s/n")
            errores.append(f"Cotizacion #{numero}: {exc}")
    return errores


def resumir_cotizaciones_venta(cotizaciones, moneda_destino, *, strict=False):
    detalles = []
    errores = []
    total_consolidado = Decimal("0")

    for cotizacion in cotizaciones:
        total_origen = _to_decimal(getattr(cotizacion, "calcular_total_estimado", 0))
        moneda_cotizacion = normalizar_moneda(getattr(cotizacion, "tipo_moneda", None))
        monedas_items = sorted(
            {
                normalizar_moneda(getattr(item, "tipo_moneda", None) or "2")
                for item in cotizacion.items.all()
            }
        )
        tiene_items_moneda_mixta = any(moneda != moneda_cotizacion for moneda in monedas_items)
        try:
            total_convertido = calcular_total_convertido_cotizacion(cotizacion, moneda_destino)
            total_consolidado += total_convertido
            error_conversion = None
        except ValueError as exc:
            total_convertido = None
            error_conversion = str(exc)
            numero = getattr(cotizacion, "numero_cotizacion", None) or getattr(cotizacion, "id", "s/n")
            errores.append(f"Cotizacion #{numero}: {error_conversion}")

        detalles.append(
            {
                "id": cotizacion.id,
                "numero_cotizacion": getattr(cotizacion, "numero_cotizacion", None),
                "nombre": getattr(cotizacion, "nombre", ""),
                "moneda_origen": moneda_cotizacion,
                "total_origen": float(cuantizar_monto(total_origen, getattr(cotizacion, "tipo_moneda", None))),
                "moneda_contrato": normalizar_moneda(moneda_destino),
                "total_convertido": float(total_convertido) if total_convertido is not None else None,
                "dolar_observado": float(_to_decimal(getattr(cotizacion, "dolar_observado", None)))
                if getattr(cotizacion, "dolar_observado", None) not in (None, "")
                else None,
                "valor_uf": float(_to_decimal(getattr(cotizacion, "valor_uf", None)))
                if getattr(cotizacion, "valor_uf", None) not in (None, "")
                else None,
                "items_count": cotizacion.items.count(),
                "tiene_items_moneda_mixta": tiene_items_moneda_mixta,
                "monedas_items": monedas_items,
                "error_conversion": error_conversion,
            }
        )

    if strict and errores:
        raise ValueError(" | ".join(errores))

    total_final = Decimal("0") if errores else cuantizar_monto(total_consolidado, moneda_destino)
    return {
        "detalles": detalles,
        "errores": errores,
        "total_contrato": total_final,
    }


def construir_resumen_venta_contrato(contrato, *, strict=False):
    cotizaciones = list(contrato.cotizaciones_vinculadas.all().prefetch_related("items"))
    resumen = resumir_cotizaciones_venta(
        cotizaciones,
        contrato.moneda_cobro,
        strict=strict,
    )
    total_contrato = resumen["total_contrato"]
    forma_pago_venta = resolver_forma_pago_venta(contrato)
    cuotas_venta = resolver_cuotas_venta(contrato, strict=strict)
    cuotas_venta_resumen = construir_resumen_cuotas_venta_por_moneda(
        total_contrato,
        contrato.moneda_cobro,
        cuotas_venta,
    )
    total_pago_unico = float(total_contrato) if forma_pago_venta == "contado" else 0.0

    return {
        "tipo_resumen": "venta",
        "moneda": contrato.moneda_cobro,
        "forma_pago_contractual": "pago_unico",
        "forma_pago_venta": forma_pago_venta,
        "forma_pago_venta_label": (
            "Cuotas" if forma_pago_venta == "cuotas" else "Contado"
        ),
        "total_mensual": 0.0,
        "total_anual": 0.0,
        "total_pago_unico": total_pago_unico,
        "total_licencias": 0.0,
        "total_contrato": float(total_contrato),
        "cuotas_venta": cuotas_venta,
        "cuotas_venta_resumen": cuotas_venta_resumen,
        "cotizaciones_vinculadas_count": len(cotizaciones),
        "cotizaciones_detalle": resumen["detalles"],
        "errores_conversion": resumen["errores"],
    }
