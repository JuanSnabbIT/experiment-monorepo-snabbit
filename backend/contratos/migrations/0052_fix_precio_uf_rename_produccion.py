# Generated manually 2026-05-13
#
# Contexto: La migracion 0036 fue vaciada durante un squash de migraciones.
# Las operaciones originales (rename precio_uf->precio, add tipo_moneda, etc.)
# quedaron en _legacy_operations y nunca se aplicaron en BD de produccion.
# Esta migracion repara la BD de produccion (PostgreSQL) con logica condicional.
# Es no-op para instalaciones frescas (donde el squash 0001_initial ya creo
# las columnas correctas).

from django.db import migrations


TABLAS_AFECTADAS = [
    'contratos_servicio',
    'contratos_historicalservicio',
    'contratos_planservicio',
    'contratos_historicalplanservicio',
]


def fix_precio_columns(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    with schema_editor.connection.cursor() as cursor:
        for tabla in TABLAS_AFECTADAS:
            # Si precio_uf existe y precio NO existe: renombrar
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{tabla}'
                          AND column_name = 'precio_uf'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{tabla}'
                          AND column_name = 'precio'
                    ) THEN
                        ALTER TABLE {tabla} RENAME COLUMN precio_uf TO precio;
                    END IF;
                END $$;
            """)

            # Si precio_uf existe y precio YA existe: eliminar precio_uf (duplicado)
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{tabla}'
                          AND column_name = 'precio_uf'
                    ) AND EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{tabla}'
                          AND column_name = 'precio'
                    ) THEN
                        ALTER TABLE {tabla} DROP COLUMN precio_uf;
                    END IF;
                END $$;
            """)

            # Eliminar precio_clp si existe
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{tabla}'
                          AND column_name = 'precio_clp'
                    ) THEN
                        ALTER TABLE {tabla} DROP COLUMN precio_clp;
                    END IF;
                END $$;
            """)

            # Eliminar precio_usd si existe
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{tabla}'
                          AND column_name = 'precio_usd'
                    ) THEN
                        ALTER TABLE {tabla} DROP COLUMN precio_usd;
                    END IF;
                END $$;
            """)

            # Agregar tipo_moneda si no existe
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{tabla}'
                          AND column_name = 'tipo_moneda'
                    ) THEN
                        ALTER TABLE {tabla}
                            ADD COLUMN tipo_moneda VARCHAR(3) NOT NULL DEFAULT 'USD';
                    END IF;
                END $$;
            """)


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0051_add_titulo_subtitulo_seccion_tipos'),
    ]

    operations = [
        migrations.RunPython(fix_precio_columns, migrations.RunPython.noop),
    ]
