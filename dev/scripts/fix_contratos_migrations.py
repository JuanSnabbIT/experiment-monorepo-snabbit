"""
Script temporal: vacía las operaciones de las migraciones squasheadas de contratos.
Razon: 0001_initial.py fue reescrito para contener el estado final completo,
por lo que todas las migraciones 0004-0036 son redundantes a nivel de DB.
En produccion ya estan marcadas como aplicadas; en tests (fresh DB) fallan con
"duplicate column name" porque 0001_initial ya creo todas las columnas.

Ejecutar desde backend/:
    python ..\dev\scripts\fix_contratos_migrations.py
"""
import os

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'contratos', 'migrations')
MIGRATIONS_DIR = os.path.normpath(MIGRATIONS_DIR)


def fix_migration(fpath):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Locate '    operations = ['
    marker = '\n    operations = ['
    start_idx = content.find(marker)
    if start_idx == -1:
        return 'no_operations_found'

    # Find the opening bracket
    bracket_open = content.find('[', start_idx + len('\n    operations'))
    if bracket_open == -1:
        return 'no_bracket_found'

    # Count brackets to find closing bracket
    depth = 0
    i = bracket_open
    while i < len(content):
        if content[i] == '[':
            depth += 1
        elif content[i] == ']':
            depth -= 1
            if depth == 0:
                break
        i += 1
    bracket_close = i  # position of closing ']'

    # Extract original operations content (everything between [ and ])
    original_inner = content[bracket_open + 1:bracket_close].strip()

    # Skip if already empty or just a comment
    if not original_inner or all(
        line.strip().startswith('#')
        for line in original_inner.split('\n')
        if line.strip()
    ):
        return 'already_empty'

    block_start = start_idx + 1  # skip the leading newline
    block_end = bracket_close + 1  # after the closing ']'
    # Include trailing newline
    if block_end < len(content) and content[block_end] == '\n':
        block_end += 1

    original_ops_block = content[bracket_open:bracket_close + 1]

    # Build replacement
    replacement = (
        '    operations = [\n'
        '        # Vacio: este contenido fue absorbido por 0001_initial durante el squash.\n'
        '        # Ver _legacy_operations para el contenido original.\n'
        '    ]\n'
        '\n'
        '    _legacy_operations = ' + original_ops_block + '\n'
    )

    new_content = content[:block_start] + replacement + content[block_end:]

    with open(fpath, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_content)

    return 'fixed'


def main():
    files = [
        f for f in sorted(os.listdir(MIGRATIONS_DIR))
        if f.endswith('.py') and f not in ('__init__.py', '0001_initial.py')
    ]

    fixed = []
    already_empty = []
    errors = []

    for fname in files:
        fpath = os.path.join(MIGRATIONS_DIR, fname)
        try:
            result = fix_migration(fpath)
            if result == 'fixed':
                fixed.append(fname)
                print(f'  [          FIXED] {fname}')
            elif result == 'already_empty':
                already_empty.append(fname)
                print(f'  [  ALREADY EMPTY] {fname}')
            else:
                errors.append(fname)
                print(f'  [          SKIP?] {fname}: {result}')
        except Exception as e:
            errors.append(fname)
            print(f'  [          ERROR] {fname}: {e}')

    print()
    print('Fixed:', len(fixed))
    print('Already empty:', len(already_empty))
    print('Errors:', len(errors))


if __name__ == '__main__':
    main()
