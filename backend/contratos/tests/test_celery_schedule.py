import importlib
from django.test import SimpleTestCase

from sw_erp.celery import app


class CeleryBeatScheduleImportTest(SimpleTestCase):
    """Smoke test para validar que las tareas de Celery Beat sean importables."""

    def test_beat_schedule_tasks_are_importable(self):
        beat_schedule = getattr(app.conf, 'beat_schedule', None)
        self.assertIsInstance(beat_schedule, dict)

        for schedule_name, schedule_config in beat_schedule.items():
            with self.subTest(schedule_name=schedule_name):
                task_path = schedule_config.get('task')
                self.assertIsInstance(task_path, str)
                self.assertNotEqual(task_path.strip(), '')

                module_path, func_name = task_path.rsplit('.', 1)
                module = importlib.import_module(module_path)
                task_object = getattr(module, func_name)

                self.assertTrue(callable(task_object), f"{task_path} no es callable")
                self.assertTrue(hasattr(task_object, 'delay'), f"{task_path} no expone delay")
