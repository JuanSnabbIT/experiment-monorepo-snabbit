import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')
import django
django.setup()

from django.test import Client
from cotizaciones.models import SolicitanteCotizacion
import json

client = Client()
print("=== TEST PUBLIC COTIZACION ===")

sol = SolicitanteCotizacion.objects.first()
if not sol:
    print("No hay solicitantes")
    exit()

sol.token_usado = False
sol.aprobo = False
sol.save()
cot = sol.cotizacion
cot.estado = 'enviada'
cot.save()
token = str(sol.token)
print(f"Token: {token}")

print("\n--- TEST 1: GET detalle ---")
resp = client.get(f'/api/public/cotizacion/{token}/')
print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    print(f"OK - Cotizacion #{data['numero_cotizacion']}")
    print(f"Items: {len(data['items'])}")
    print(f"Puede responder: {data['solicitante']['puede_responder']}")
else:
    print(f"Error: {resp.content.decode()}")

print("\n--- TEST 2: POST aprobar ---")
items = list(cot.items.values_list('id', flat=True))
print(f"Items a aprobar: {items}")
resp = client.post(
    f'/api/public/cotizacion/{token}/aprobar/',
    data=json.dumps({'item_ids': items}),
    content_type='application/json'
)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.json()}")
sol.refresh_from_db()
cot.refresh_from_db()
print(f"Token usado: {sol.token_usado}, Estado: {cot.estado}")

print("\n--- TEST 3: Token ya usado ---")
resp = client.post(
    f'/api/public/cotizacion/{token}/aprobar/',
    data=json.dumps({'item_ids': []}),
    content_type='application/json'
)
print(f"Status: {resp.status_code} (esperado 400)")
print(f"Response: {resp.json()}")

print("\n--- TEST 4: Rechazar (nuevo token) ---")
sol.token_usado = False
sol.aprobo = False
import uuid
sol.token = uuid.uuid4()
sol.save()
cot.estado = 'enviada'
cot.save()
token2 = str(sol.token)
print(f"Nuevo token: {token2}")
resp = client.post(
    f'/api/public/cotizacion/{token2}/rechazar/',
    data=json.dumps({'motivo': 'Precio fuera de presupuesto'}),
    content_type='application/json'
)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.json()}")
sol.refresh_from_db()
print(f"Motivo guardado: {sol.motivo_rechazo}")

print("\n=== TESTS COMPLETADOS ===")
