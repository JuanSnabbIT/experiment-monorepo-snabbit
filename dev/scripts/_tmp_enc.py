import re, sys
files = [
    r'c:\proyectos\experiment-monorepo-snabbit\backend\contratos\models.py',
    r'c:\proyectos\experiment-monorepo-snabbit\backend\contratos\serializers.py',
    r'c:\proyectos\experiment-monorepo-snabbit\backend\contratos\motor_plantillas_v2.py',
]
pat = re.compile(r'\u00c3[\u0080-\u00bf]|\u00e2\u0080|\u00c2\u00b0|\ufffd')
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        c = fh.read()
    if pat.search(c):
        print(f'MOJIBAKE: {f}')
    else:
        print(f'OK: {f}')