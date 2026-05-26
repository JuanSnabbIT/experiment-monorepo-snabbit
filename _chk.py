import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()
from empresas.models import Empresa
from items.models import Item
from cuentas.models import User
print("Empresas:", Empresa.objects.count())
print("Items:", Item.objects.count())
print("Superusers:", User.objects.filter(is_superuser=True).count())