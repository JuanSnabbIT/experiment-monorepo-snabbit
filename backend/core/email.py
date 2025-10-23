from djoser import email

class ActivationEmail(email.ActivationEmail):
    template_name = 'email-djoser/activation.html'

class ConfirmationEmail(email.ConfirmationEmail):
    template_name = "email-djoser/confirmation.html"

class PasswordResetEmail(email.PasswordResetEmail):
    template_name = 'email-djoser/password_reset.html'

class PasswordChangedConfirmationEmail(email.PasswordChangedConfirmationEmail):
    template_name = "email-djoser/password_changed_confirmation.html"