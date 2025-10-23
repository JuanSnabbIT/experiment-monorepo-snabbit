from django import forms
from django.contrib.contenttypes.models import ContentType
from contratos.models import ContratoServicio, Servicio, PlanServicio

class ContratoServicioForm(forms.ModelForm):
    """
    Formulario para manejar la selección de Servicios y Planes en el Admin
    sin desplazar columnas en el TabularInline.
    """
    # Definimos un campo genérico 'servicio_plan', que luego en __init__
    # cambiaremos de widget según sea nuevo o existente.
    servicio_plan = forms.CharField(label="Servicio o Plan", required=False)

    class Meta:
        model = ContratoServicio
        fields = ['servicio_plan', 'cantidad', 'precio_unitario']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.instance and self.instance.pk:
            # ─────────────
            # REGISTRO EXISTENTE
            # ─────────────
            # Queremos que aparezca un texto de solo lectura en lugar del select
            if isinstance(self.instance.servicio_generico, Servicio):
                texto = f"Servicio: {self.instance.servicio_generico.nombre}"
            else:
                texto = f"Plan: {self.instance.servicio_generico.nombre}"

            # Ajustamos el campo a un CharField con widget de solo lectura:
            self.fields['servicio_plan'].initial = texto
            self.fields['servicio_plan'].widget.attrs['readonly'] = True

        else:
            # ─────────────
            # REGISTRO NUEVO
            # ─────────────
            # Aquí sí usamos un ChoiceField con opciones de servicios y planes
            opciones_servicios = [
                (f"servicio-{s.id}", f"Servicio: {s.nombre}")
                for s in Servicio.objects.all()
            ]
            opciones_planes = [
                (f"plan-{p.id}", f"Plan: {p.nombre}")
                for p in PlanServicio.objects.all()
            ]
            lista_choices = [("", "---------")] + opciones_servicios + opciones_planes

            # Reemplazamos 'servicio_plan' por un ChoiceField obligatorio:
            self.fields['servicio_plan'] = forms.ChoiceField(
                label="Servicio o Plan",
                choices=lista_choices,
                required=True
            )

    def clean_servicio_plan(self):
        """
        - Si es nuevo, exigimos seleccionar algo.
        - Si es existente, no hacemos validaciones (está en modo lectura).
        """
        if not self.instance.pk:
            valor = self.cleaned_data.get('servicio_plan')
            if not valor:
                raise forms.ValidationError("Debes seleccionar un Servicio o Plan.")
            return valor
        else:
            # En registros existentes, devolvemos el objeto tal cual,
            # o simplemente devolvemos el texto sin forzar validaciones.
            return self.instance.servicio_generico

    def clean(self):
        """
        Asignamos content_type y object_id si es un registro nuevo.
        """
        cleaned_data = super().clean()
        if not self.instance.pk:
            servicio_plan = cleaned_data.get("servicio_plan")
            if servicio_plan:
                tipo, obj_id = servicio_plan.split('-')
                obj_id = int(obj_id)
                if tipo == "servicio":
                    modelo = Servicio
                elif tipo == "plan":
                    modelo = PlanServicio
                else:
                    raise forms.ValidationError("Selección inválida.")
                cleaned_data['content_type'] = ContentType.objects.get_for_model(modelo)
                cleaned_data['object_id'] = obj_id
        return cleaned_data

    def save(self, commit=True):
        """
        Guardamos el registro, asignando content_type y object_id si es nuevo.
        """
        instance = super().save(commit=False)
        # Solo asignamos content_type y object_id al crear un registro nuevo.
        if not instance.pk:
            instance.content_type = self.cleaned_data.get("content_type")
            instance.object_id = self.cleaned_data.get("object_id")
        if commit:
            instance.save()
        return instance
