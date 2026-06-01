path = r'c:\proyectos\experiment-monorepo-snabbit\frontend\src\pages\Registros\PlantillasContratoV2\components\PanelDocumento.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
marker = "// \u2500\u2500 Salto de p"
idx = content.find(marker)
print(repr(content[idx:idx+700]))