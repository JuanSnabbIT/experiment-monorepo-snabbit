from pathlib import Path

path = Path("frontend/src/pages/Facturacion/ItemDetailModal.tsx")
lines = path.read_text(encoding="utf-8").splitlines()

start = next(i for i, line in enumerate(lines) if "if (candidateIds.size === 0)" in line)
content_line = next(
    i for i, line in enumerate(lines[start:], start) if "if (contentType.includes('rendiciones')" in line
)
end = content_line + 2  # include addUrl line and closing brace

new_block = [
    "					pushId(item.item_id);",
    "					pushId(item.parent_id);",
    "					pushId(item.item_rendicion_id);",
    "					pushId(item.id);",
    "",
    "					if (candidateIds.size === 0) {",
    "						setData(buildFallback());",
    "						return;",
    "					}",
    "",
    "					const urls = new Set<string>();",
    "					const addUrl = (url: string) => {",
    "						if (url) {",
    "							urls.add(url);",
    "						}",
    "					};",
    "					candidateIds.forEach((candidate) => {",
    "						addUrl(`/api/gastos-operativos/${candidate}/`);",
    "						addUrl(`/api/detalles-gasto/${candidate}/`);",
    "						if (otId) {",
    "							addUrl(`/api/ordenes-de-trabajo/${otId}/gastos-operativos/${candidate}/`);",
    "							addUrl(`/api/ordenes-trabajo/${otId}/gastos-operativos/${candidate}/`);",
    "						}",
    "					});",
    "",
    "					if (contentType.includes('rendiciones') && item.rendicion_id) {",
    "						addUrl(`/api/rendiciones/${item.rendicion_id}/`);",
    "					}",
]

lines[start:end + 1] = new_block
path.write_text("\n".join(lines) + "\n", encoding="utf-8")
