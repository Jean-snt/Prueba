from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.models import User
from django.contrib import messages
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.mail import send_mail
from django.conf import settings
import json
import logging

from ..models.user_profile import UserProfile

# Configurar logging
logger = logging.getLogger(__name__)


def send_verification_code_email(user, code):
    """
    Envía el código de verificación por email real con soporte UTF-8.
    Maneja caracteres especiales (ñ, tildes) correctamente.
    """
    try:
        # Limpiar nombre de usuario para el subject (solo ASCII)
        import unicodedata
        import re
        
        # Obtener nombre completo o username
        full_name = user.profile.get_full_name() if hasattr(user, 'profile') else user.username
        
        # Limpiar caracteres especiales para el subject
        def clean_for_subject(text):
            # Normalizar caracteres Unicode (ñ -> n, á -> a, etc.)
            normalized = unicodedata.normalize('NFD', text)
            # Remover diacríticos (tildes, acentos)
            ascii_text = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
            # Mantener solo caracteres ASCII seguros
            safe_text = re.sub(r'[^\w\s-]', '', ascii_text)
            return safe_text.strip()
        
        # Subject limpio (sin caracteres especiales)
        clean_name = clean_for_subject(full_name)
        subject = f'Codigo de Verificacion - Cuestom - {clean_name}'
        
        # Crear mensaje HTML (puede contener caracteres especiales)
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(45deg, #667eea, #764ba2); padding: 20px; border-radius: 10px; text-align: center; color: white;">
                <h1 style="margin: 0;">🔐 Cuestom</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema de Encuestas</p>
            </div>
            
            <div style="padding: 30px 20px; background: #f9f9f9; border-radius: 10px; margin-top: 20px;">
                <h2 style="color: #333; margin-top: 0;">¡Hola {full_name}!</h2>
                
                <p style="color: #666; line-height: 1.6;">
                    Tu código de verificación para completar el registro en Cuestom es:
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border-left: 4px solid #667eea;">
                    <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 8px;">{code}</h1>
                </div>
                
                <p style="color: #666; line-height: 1.6;">
                    <strong>⏰ Este código expira en 15 minutos.</strong>
                </p>
                
                <p style="color: #666; line-height: 1.6;">
                    Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 14px; text-align: center;">
                    ¡Gracias por unirte a Cuestom! 🚀<br>
                    El futuro de las encuestas interactivas.
                </p>
            </div>
        </div>
        """
        
        # Mensaje de texto plano como fallback
        plain_message = f"""
        🔐 CÓDIGO DE VERIFICACIÓN - CUESTOM
        
        Hola {full_name},
        
        Tu código de verificación para completar el registro en Cuestom es:
        
        {code}
        
        ⏰ Este código expira en 15 minutos.
        
        Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
        
        ¡Gracias por unirte a Cuestom! 🚀
        El futuro de las encuestas interactivas.
        """
        
        # Enviar email con codificación UTF-8 explícita
        from django.core.mail import EmailMultiAlternatives
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        
        # Agregar versión HTML
        msg.attach_alternative(html_message, "text/html")
        
        # Configurar codificación UTF-8
        msg.encoding = 'utf-8'
        
        # Enviar email
        msg.send(fail_silently=False)
        
        logger.info(f"✅ Código de verificación enviado por email a {user.email} para usuario {user.username}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error enviando email de verificación a {user.email}: {str(e)}")
        
        # Fallback: mostrar en consola si falla el email
        print(f"\n" + "="*60)
        print(f"📧 CÓDIGO DE VERIFICACIÓN PARA {user.username}")
        print(f"Email: {user.email}")
        print(f"="*60)
        print(f"🔐 CÓDIGO: {code}")
        print(f"⏰ Expira en 15 minutos")
        print(f"❌ Error SMTP: {str(e)}")
        print(f"="*60)
        print()
        
        return False


@require_http_methods(["POST"])
@csrf_exempt
def api_check_nickname(request):
    """
    API endpoint para verificar disponibilidad de nickname en tiempo real
    """
    try:
        data = json.loads(request.body)
        nickname = data.get('nickname', '').strip()
        
        if not nickname:
            return JsonResponse({
                'available': True
            })
        
        # Verificar si el nickname ya existe en nickname del perfil O como username
        exists_in_nickname = UserProfile.objects.filter(nickname__iexact=nickname).exists()
        exists_in_username = User.objects.filter(username__iexact=nickname).exists()
        
        return JsonResponse({
            'available': not (exists_in_nickname or exists_in_username),
            'nickname': nickname
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        logger.error(f"Error verificando nickname: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor.'
        }, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def api_register(request):
    """
    API endpoint para registro desde React
    ✅ ANTI-SPAM: Bloqueo de emails temporales/desechables
    ✅ VALIDACIÓN: Nickname único y edad mínima 18 años
    """
    try:
        data = json.loads(request.body)
        
        # Obtener datos
        username = data.get('username')
        nickname = data.get('nickname', '').strip()
        email = data.get('email', '').lower().strip()
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        age = data.get('age')
        country = data.get('country')
        phone_number = data.get('phone_number')

        # Validaciones básicas
        if not all([username, email, password, first_name, last_name]):
            return JsonResponse({
                'success': False,
                'error': 'Todos los campos obligatorios deben ser completados.'
            }, status=400)
        
        # ✅ VALIDACIÓN: Edad mínima 18 años
        if age:
            age_int = int(age)
            if age_int < 18:
                return JsonResponse({
                    'success': False,
                    'error': 'Debes tener al menos 18 años para registrarte en Cuestom.'
                }, status=400)
        
        # ✅ VALIDACIÓN: Nickname único (si se proporciona)
        if nickname:
            if UserProfile.objects.filter(nickname__iexact=nickname).exists():
                return JsonResponse({
                    'success': False,
                    'error': 'Este apodo ya está registrado, por favor elige otro.'
                }, status=400)

        # ✅ ANTI-SPAM: Validar dominio de email (bloquear temporales)
        TEMP_EMAIL_DOMAINS = [
            'tempmail.com', '10minutemail.com', 'guerrillamail.com',
            'mailinator.com', 'throwaway.email', 'temp-mail.org',
            'fakeinbox.com', 'maildrop.cc', 'yopmail.com', 'trashmail.com',
            'getnada.com', 'tempmail.net', 'sharklasers.com', 'guerrillamail.info',
            'grr.la', 'guerrillamail.biz', 'guerrillamail.de', 'spam4.me',
            'mailnesia.com', 'mytemp.email', 'mohmal.com', 'emailondeck.com',
            'mintemail.com', 'dispostable.com', 'anonbox.net', 'anonymbox.com',
        ]
        
        email_domain = email.split('@')[-1] if '@' in email else ''
        
        if email_domain in TEMP_EMAIL_DOMAINS:
            return JsonResponse({
                'success': False,
                'error': 'No se permiten emails temporales o desechables. Por favor usa un email permanente.'
            }, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({
                'success': False,
                'error': 'El nombre de usuario ya existe.'
            }, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'El email ya está registrado.'
            }, status=400)

        with transaction.atomic():
            # Crear usuario INACTIVO
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=False  # Usuario inactivo hasta verificación
            )

            # Actualizar perfil
            profile = user.profile
            profile.first_name = first_name
            profile.last_name = last_name
            profile.nickname = nickname if nickname else None
            profile.age = int(age) if age else None
            profile.country = country if country else None
            profile.phone_number = phone_number
            profile.save()

            # Generar código de verificación
            verification_code = profile.generate_verification_code()
            
            # Enviar código por email real
            email_sent = send_verification_code_email(user, verification_code)

            return JsonResponse({
                'success': True,
                'message': f'Cuenta creada exitosamente. Se ha enviado un código de verificación.',
                'user_id': user.id,
                'username': user.username,
                'requires_verification': True
            })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error al crear la cuenta: {str(e)}'
        }, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def api_verify_account(request):
    """API endpoint para verificar cuenta con código"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        code = data.get('code')

        if not username or not code:
            return JsonResponse({
                'success': False,
                'error': 'Username y código son requeridos.'
            }, status=400)

        try:
            user = User.objects.get(username=username)
            profile = user.profile
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Usuario no encontrado.'
            }, status=404)

        # Verificar el código
        success, message = profile.verify_code(code)
        
        if success:
            return JsonResponse({
                'success': True,
                'message': message,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': profile.get_full_name(),
                    'is_verified': profile.is_verified,
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'error': message
            }, status=400)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error en la verificación: {str(e)}'
        }, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def api_resend_verification_code(request):
    """API endpoint para reenviar código de verificación"""
    try:
        data = json.loads(request.body)
        username = data.get('username')

        if not username:
            return JsonResponse({
                'success': False,
                'error': 'Username es requerido.'
            }, status=400)

        try:
            user = User.objects.get(username=username)
            profile = user.profile
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Usuario no encontrado.'
            }, status=404)

        if profile.is_verified:
            return JsonResponse({
                'success': False,
                'error': 'La cuenta ya está verificada.'
            }, status=400)

        if not profile.can_request_new_code():
            return JsonResponse({
                'success': False,
                'error': 'Debes esperar antes de solicitar un nuevo código.'
            }, status=400)

        # Generar nuevo código
        verification_code = profile.generate_verification_code()
        
        # Enviar código por email real
        email_sent = send_verification_code_email(user, verification_code)

        return JsonResponse({
            'success': True,
            'message': 'Nuevo código de verificación enviado.'
        })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error al reenviar código: {str(e)}'
        }, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def api_login(request):
    """API endpoint para login desde React"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return JsonResponse({
                'success': False,
                'error': 'Username y password son requeridos.'
            }, status=400)

        user = authenticate(username=username, password=password)
        if user:
            # ✅ NUEVO: Verificar si el usuario está suspendido
            if hasattr(user, 'profile'):
                is_active, message = user.profile.check_and_lift_suspension()
                
                if not is_active:
                    return JsonResponse({
                        'success': False,
                        'error': message,
                        'suspended': True
                    }, status=403)
            
            # Verificar si la cuenta está verificada
            if hasattr(user, 'profile') and not user.profile.is_verified:
                return JsonResponse({
                    'success': False,
                    'error': 'Cuenta no verificada. Por favor verifica tu cuenta primero.',
                    'requires_verification': True,
                    'username': user.username
                }, status=401)
            
            # Generar o obtener token para el usuario
            from rest_framework.authtoken.models import Token
            token, created = Token.objects.get_or_create(user=user)
            
            login(request, user)
            return JsonResponse({
                'success': True,
                'message': f'¡Bienvenido de vuelta, {user.username}!',
                'token': token.key,  # ← Token para autenticación API
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.profile.get_full_name() if hasattr(user, 'profile') else '',
                    'country': str(user.profile.country) if hasattr(user, 'profile') and user.profile.country else None,
                    'is_verified': user.profile.is_verified if hasattr(user, 'profile') else False,
                    'is_staff': user.is_staff,  # ← Agregado para mostrar/ocultar Panel Admin
                    'is_superuser': user.is_superuser,  # ← Info adicional de permisos
                    'is_vip': user.profile.is_vip if hasattr(user, 'profile') else False,  # ← Estado VIP
                    'is_active': user.is_active,  # ✅ NUEVO: Estado de activación
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Credenciales inválidas.'
            }, status=401)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error en el login: {str(e)}'
        }, status=500)


def register_view(request):
    """Vista de registro tradicional (HTML) - Actualizada para verificación"""
    if request.method == 'POST':
        # Obtener datos del formulario
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        password_confirm = request.POST.get('password_confirm')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        age = request.POST.get('age')
        country = request.POST.get('country')
        phone_number = request.POST.get('phone_number')

        # Validaciones básicas
        if not all([username, email, password, first_name, last_name]):
            messages.error(request, 'Todos los campos obligatorios deben ser completados.')
            return render(request, 'registration/register.html')

        if password != password_confirm:
            messages.error(request, 'Las contraseñas no coinciden.')
            return render(request, 'registration/register.html')

        if User.objects.filter(username=username).exists():
            messages.error(request, 'El nombre de usuario ya existe.')
            return render(request, 'registration/register.html')

        if User.objects.filter(email=email).exists():
            messages.error(request, 'El email ya está registrado.')
            return render(request, 'registration/register.html')

        try:
            with transaction.atomic():
                # Crear usuario INACTIVO
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    is_active=False  # Usuario inactivo hasta verificación
                )

                # Actualizar perfil
                profile = user.profile
                profile.first_name = first_name
                profile.last_name = last_name
                profile.age = int(age) if age else None
                profile.country = country if country else None
                profile.phone_number = phone_number
                profile.save()

                # Generar código de verificación
                verification_code = profile.generate_verification_code()
                
                # Enviar código por email real
                email_sent = send_verification_code_email(user, verification_code)

                messages.success(request, f'Cuenta creada exitosamente. Se ha enviado un código de verificación a tu email.')
                return redirect('surveys:verify_account', username=username)

        except Exception as e:
            messages.error(request, f'Error al crear la cuenta: {str(e)}')

    return render(request, 'registration/register.html')


def verify_account_view(request, username):
    """Vista HTML para verificar cuenta"""
    try:
        user = User.objects.get(username=username)
        profile = user.profile
    except User.DoesNotExist:
        messages.error(request, 'Usuario no encontrado.')
        return redirect('login')

    if profile.is_verified:
        messages.info(request, 'Tu cuenta ya está verificada.')
        return redirect('login')

    if request.method == 'POST':
        code = request.POST.get('verification_code')
        
        if not code:
            messages.error(request, 'Por favor ingresa el código de verificación.')
            return render(request, 'registration/verify_account.html', {'username': username})

        success, message = profile.verify_code(code)
        
        if success:
            messages.success(request, message)
            return redirect('login')
        else:
            messages.error(request, message)

    return render(request, 'registration/verify_account.html', {
        'username': username,
        'user_full_name': profile.get_full_name()
    })


def send_password_reset_email(user, reset_code):
    """
    Envía el código de recuperación de contraseña por email con branding profesional
    """
    try:
        # Obtener nombre completo o username
        full_name = user.profile.get_full_name() if hasattr(user, 'profile') else user.username
        
        # Subject profesional
        subject = f'Cuestom - Código de recuperación: {reset_code}'
        
        # Crear mensaje HTML profesional
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: linear-gradient(45deg, #667eea, #764ba2); padding: 30px; border-radius: 15px; text-align: center; color: white; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🔐 Cuestom</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Plataforma de Encuestas</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0; font-size: 24px;">Recuperación de Contraseña</h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Hola <strong>{full_name}</strong>,
                </p>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Cuestom.
                </p>
                
                <div style="background: linear-gradient(45deg, #667eea, #764ba2); padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0;">
                    <p style="color: white; margin: 0; font-size: 14px; opacity: 0.9;">Tu código de recuperación es:</p>
                    <h1 style="color: #ffd700; margin: 10px 0; font-size: 36px; font-weight: bold; letter-spacing: 3px;">{reset_code}</h1>
                    <p style="color: white; margin: 0; font-size: 12px; opacity: 0.8;">Este código expira en 15 minutos</p>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>⚠️ Importante:</strong> Si no solicitaste este cambio, ignora este correo. 
                        Tu contraseña permanecerá sin cambios.
                    </p>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                    Por tu seguridad, este código solo es válido por 15 minutos. Si necesitas un nuevo código, 
                    puedes solicitarlo desde la página de recuperación.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                    Este correo fue enviado automáticamente por <strong>Cuestom</strong><br>
                    Si tienes problemas, contacta a nuestro equipo de soporte.
                </p>
            </div>
        </div>
        """
        
        # Mensaje de texto plano como fallback
        plain_message = f"""
        Cuestom - Recuperación de Contraseña
        
        Hola {full_name},
        
        Tu código de recuperación es: {reset_code}
        
        Este código expira en 15 minutos.
        
        Si no solicitaste este cambio, ignora este correo.
        
        Equipo Cuestom
        """
        
        # Enviar email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Código de recuperación enviado a {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Error enviando código de recuperación a {user.email}: {str(e)}")
        return False


@require_http_methods(["POST"])
@csrf_exempt
def api_password_reset_request(request):
    """
    API endpoint para solicitar recuperación de contraseña
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        
        if not email:
            return JsonResponse({
                'success': False,
                'error': 'El correo electrónico es requerido.'
            }, status=400)
        
        # Verificar si el email existe
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Por seguridad, no revelamos si el email existe o no
            return JsonResponse({
                'success': True,
                'message': 'Si el correo existe en nuestro sistema, recibirás un código de recuperación.'
            })
        
        # Verificar que la cuenta esté verificada
        if hasattr(user, 'profile') and not user.profile.is_verified:
            return JsonResponse({
                'success': False,
                'error': 'La cuenta debe estar verificada para recuperar la contraseña.'
            }, status=400)
        
        # Obtener IP del cliente
        def get_client_ip(request):
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            return ip
        
        client_ip = get_client_ip(request)
        
        # Generar token de recuperación
        from ..models.password_reset import PasswordResetToken
        reset_token = PasswordResetToken.generate_token(user, client_ip)
        
        # Enviar código por email
        email_sent = send_password_reset_email(user, reset_token.code)
        
        if email_sent:
            return JsonResponse({
                'success': True,
                'message': 'Código de recuperación enviado. Revisa tu correo electrónico.'
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Error al enviar el correo. Inténtalo de nuevo más tarde.'
            }, status=500)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        logger.error(f"Error en password reset request: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor.'
        }, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def api_password_reset_confirm(request):
    """
    API endpoint para confirmar recuperación de contraseña
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        reset_code = data.get('code', '').strip()
        new_password = data.get('new_password', '')
        
        if not all([email, reset_code, new_password]):
            return JsonResponse({
                'success': False,
                'error': 'Todos los campos son requeridos.'
            }, status=400)
        
        # Validar longitud de contraseña
        if len(new_password) < 6:
            return JsonResponse({
                'success': False,
                'error': 'La contraseña debe tener al menos 6 caracteres.'
            }, status=400)
        
        # Verificar usuario
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Usuario no encontrado.'
            }, status=404)
        
        # Verificar token
        from ..models.password_reset import PasswordResetToken
        is_valid, message, reset_token = PasswordResetToken.verify_token(user, reset_code)
        
        if not is_valid:
            # Si hay un token, incluir información de bloqueo
            response_data = {
                'success': False,
                'error': message
            }
            
            if reset_token and reset_token.is_currently_blocked:
                response_data['blocked'] = True
                response_data['time_until_unblock'] = reset_token.time_until_unblock
            
            return JsonResponse(response_data, status=400)
        
        # Token válido, actualizar contraseña
        try:
            with transaction.atomic():
                # Cambiar contraseña
                user.set_password(new_password)
                user.save()
                
                # Marcar token como usado
                reset_token.use_token()
                
                logger.info(f"Contraseña actualizada para usuario {user.username}")
                
                return JsonResponse({
                    'success': True,
                    'message': 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.'
                })
                
        except Exception as e:
            logger.error(f"Error actualizando contraseña para {user.username}: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': 'Error al actualizar la contraseña.'
            }, status=500)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        logger.error(f"Error en password reset confirm: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor.'
        }, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def api_password_reset_status(request):
    """
    API endpoint para verificar el estado de bloqueo de un token
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        
        if not email:
            return JsonResponse({
                'success': False,
                'error': 'El correo electrónico es requerido.'
            }, status=400)
        
        # Verificar usuario
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Usuario no encontrado.'
            }, status=404)
        
        # Buscar token activo
        from ..models.password_reset import PasswordResetToken
        active_token = PasswordResetToken.objects.filter(
            user=user,
            is_used=False
        ).first()
        
        if not active_token:
            return JsonResponse({
                'success': True,
                'has_token': False,
                'blocked': False,
                'time_until_unblock': 0
            })
        
        return JsonResponse({
            'success': True,
            'has_token': True,
            'blocked': active_token.is_currently_blocked,
            'time_until_unblock': active_token.time_until_unblock,
            'attempts': active_token.attempts,
            'max_attempts': 3,
            'expired': active_token.is_expired
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        logger.error(f"Error en password reset status: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Error interno del servidor.'
        }, status=500)

# ==========================================
# ENDPOINT DE PERFIL DE USUARIO
# ==========================================

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_user_profile(request):
    """
    Obtener perfil del usuario logueado
    """
    try:
        user = request.user
        profile = user.profile
        
        # ✅ NUEVO: Obtener información de suscripción VIP
        vip_expiry = None
        days_remaining = 0
        
        # ✅ DEBUG: Verificar si el usuario tiene suscripción
        print(f"🔍 Usuario: {user.username}, is_vip: {profile.is_vip}")
        
        if profile.is_vip:
            try:
                subscription = user.subscription
                print(f"✅ Suscripción encontrada: {subscription}")
                print(f"   - Status: {subscription.status}")
                print(f"   - End date: {subscription.end_date}")
                
                if subscription.end_date:
                    vip_expiry = subscription.end_date.isoformat()
                    days_remaining = subscription.days_remaining
                    print(f"   - Days remaining: {days_remaining}")
                else:
                    print("⚠️ Suscripción sin end_date")
            except Exception as sub_err:
                print(f"❌ Error obteniendo suscripción: {sub_err}")
        else:
            print("ℹ️ Usuario no es VIP")
        
        profile_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': profile.first_name,
            'last_name': profile.last_name,
            'full_name': profile.get_full_name(),
            'country': str(profile.country) if profile.country else 'PE',  # Default a Perú
            'country_name': profile.country.name if profile.country else 'Perú',
            'age': profile.age,
            'gender': profile.gender,
            'phone_number': profile.phone_number,
            'is_verified': profile.is_verified,
            'is_vip': profile.is_vip,
            'karma': profile.karma,  # ✅ NUEVO: Campo de karma
            'vip_expiry': vip_expiry,  # ✅ NUEVO: Fecha de vencimiento VIP
            'vip_days_remaining': days_remaining,  # ✅ NUEVO: Días restantes
            'date_joined': user.date_joined.isoformat(),
        }
        
        print(f"📤 Enviando profile_data: vip_expiry={vip_expiry}, days_remaining={days_remaining}")
        
        return Response({
            'success': True,
            'profile': profile_data
        })
        
    except Exception as e:
        print(f"❌ Error en api_user_profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': f'Error obteniendo perfil: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)