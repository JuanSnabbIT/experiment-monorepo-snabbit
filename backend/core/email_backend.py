"""
Backend de email personalizado que desactiva la verificación de certificados SSL.
ADVERTENCIA: Solo usar en desarrollo o cuando el servidor de correo tiene
un certificado inválido/autofirmado.
"""

import ssl
from django.core.mail.backends.smtp import EmailBackend


class EmailBackendSinVerificacionSSL(EmailBackend):
    """
    Backend SMTP que no verifica el certificado SSL del servidor.
    """

    def open(self):
        if self.connection:
            return False

        try:
            self.connection = self.connection_class(
                self.host, self.port, timeout=self.timeout
            )

            # Crear contexto SSL sin verificación
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE

            if self.use_tls:
                self.connection.starttls(context=context)
            
            if self.username and self.password:
                self.connection.login(self.username, self.password)
            
            return True
        except Exception:
            if not self.fail_silently:
                raise
            return False
