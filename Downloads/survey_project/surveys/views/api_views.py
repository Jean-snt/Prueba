from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone  # ✅ FIX 1: Import timezone
from datetime import timedelta  # ✅ FIX: Import timedelta
import json
import sys  # ✅ Para logging de debugging

# Django REST Framework imports
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.response import Response
from rest_framework import status

from ..models.survey import Survey, Question, Choice
# from ..models.response import Response as SurveyResponse, Answer  # ← COMENTADO: Sistema unificado
from ..models.notification import Notification
from ..models.comment import Comment
from ..models.report import Report
from ..models.subscription import Subscription
from django.contrib.contenttypes.models import ContentType


def _serialize_survey(s: Survey, request_user=None):
    """
    Serializa una encuesta con información de propiedad
    
    Args:
        s: Survey object
        request_user: Usuario que hace la petición (para determinar is_owner)
    """
    creator_data = None
    is_creator_vip = False
    is_owner = False  # ✅ FIX 1: Campo booleano de propiedad
    user_liked = False  # ✅ NUEVO: Estado de like del usuario
    user_disliked = False  # ✅ NUEVO: Estado de dislike del usuario
    
    # ✅ FIX 1: Determinar propiedad usando IDs directamente
    if request_user and request_user.is_authenticated and s.creator:
        is_owner = (request_user.id == s.creator.id)
        # ✅ NUEVO: Verificar si el usuario dio like o dislike
        user_liked = request_user in s.liked_by.all()
        user_disliked = request_user in s.disliked_by.all()
    
    # Solo mostrar información del creador si está verificado
    if s.creator and hasattr(s.creator, 'profile') and s.creator.profile.is_verified:
        # ✅ CRÍTICO: Implementar lógica de máscara de anonimato para encuestas
        is_anonymous = s.creator_identity and not s.creator_identity.get('showRealName', True)
        
        # ✅ NUEVO: Detectar si el creador es VIP
        is_creator_vip = s.creator.profile.is_vip if hasattr(s.creator, 'profile') else False
        
        profile_image_url = s.creator.profile.profile_image.url if hasattr(s.creator, 'profile') and s.creator.profile.profile_image else None
        creator_data = {
            # ✅ PERSISTENCIA HISTÓRICA: Usar creator_display_name si existe
            'username': "anonimo" if is_anonymous else (s.creator_display_name or s.creator.username),
            'display_name': "Usuario anónimo" if is_anonymous else (s.creator_display_name or s.creator.username),
            'full_name': "" if is_anonymous else (s.creator.profile.get_full_name() if hasattr(s.creator, 'profile') else ''),
            'gender': s.creator_gender,
            'age': s.creator.profile.age if hasattr(s.creator, 'profile') and not is_anonymous else None,
            # ✅ FIX 4: BANDERAS EN MODO ANÓNIMO - Siempre mostrar país (incluso si es anónimo)
            'country': {
                'code': str(s.creator.profile.country) if hasattr(s.creator, 'profile') and s.creator.profile.country else None,
                'name': s.creator.profile.country.name if hasattr(s.creator, 'profile') and s.creator.profile.country else None,
            } if hasattr(s.creator, 'profile') and s.creator.profile.country else None,
            'is_vip': is_creator_vip,
            'id': s.creator.id,  # ✅ FIX 1: Incluir ID del creador
            'profile_image': profile_image_url,
        }
    
    # ✅ UNIFICADO: Fórmula de ranking consistente con Top Histórico
    # Fórmula: (Likes * 2) + (Respuestas * 1) - (Dislikes * 1)
    respuestas_count = s.comments.count()
    ranking_score = (s.likes_count * 2) + respuestas_count - s.dislikes_count
    
    # ✅ RESPUESTAS VIP: Contar sumisiones de feedback VIP (para estadísticas)
    from ..models.vip_feedback import VipFeedbackSubmission
    vip_responses_count = VipFeedbackSubmission.objects.filter(survey=s).count()
    
    return {
        'id': s.id,
        'title': s.title,
        'description': s.description,
        'is_active': s.is_active,
        'is_nsfw': s.is_nsfw,
        'created_at': s.created_at.isoformat(),
        'expires_at': s.expires_at.isoformat() if s.expires_at else None,  # ✅ NUEVO: Fecha de expiración
        'creator': creator_data,
        'creator_gender': s.creator_gender,
        'creator_identity': s.creator_identity,  # ✅ NUEVO: Información de identidad
        'response_count': respuestas_count,
        'image_url': s.image.url if s.image else None,
        'likes_count': s.likes_count,
        'dislikes_count': s.dislikes_count,
        'user_liked': user_liked,  # ✅ NUEVO: Estado de like del usuario
        'user_disliked': user_disliked,  # ✅ NUEVO: Estado de dislike del usuario
        'is_vip': is_creator_vip,
        'is_owner': is_owner,
        'ranking_score': ranking_score,
        'vip_responses_count': vip_responses_count,
    }


def _serialize_question(q: Question):
    return {
        'id': q.id,
        'text': q.text,
        'type': q.type,
        'choices': [
            {
                'id': c.id,
                'text': c.text,
            }
            for c in q.choices.all()
        ],
    }


@api_view(['GET'])
@permission_classes([])  # Permitir acceso anónimo
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_surveys(request):
    """
    Obtiene todas las encuestas activas con filtros VIP opcionales y paginación.
    Solo muestra encuestas de usuarios verificados.
    
    Parámetros de filtro VIP:
    - country: Código de país (ej: PE, MX, CO)
    - age_min: Edad mínima del creador
    - age_max: Edad máxima del creador  
    - gender: Género del creador (M, F, O, N)
    - show_nsfw: Mostrar contenido NSFW (true/false)
    - time_range: Rango de tiempo (24h, 3d, 1w, 1m, 1y, 3m_ranking)
    - page: Número de página (default: 1)
    - page_size: Tamaño de página (default: 20, max: 100)
    """
    from datetime import datetime, timedelta
    from django.utils import timezone
    from django.core.paginator import Paginator, EmptyPage
    
    # Filtrar encuestas activas de usuarios verificados
    surveys = Survey.objects.filter(
        is_active=True,
        creator__profile__is_verified=True
    ).select_related('creator', 'creator__profile')
    
    # ✅ CRÍTICO: Excluir encuestas temporales que ya expiraron
    from django.db.models import Q
    now = timezone.now()
    surveys = surveys.filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    )
    
    # Verificar si el usuario es VIP para filtros avanzados
    user_is_vip = False
    if request.user.is_authenticated:
        try:
            user_is_vip = (
                request.user.profile.is_vip or 
                (hasattr(request.user, 'subscription') and 
                 request.user.subscription.is_active and 
                 request.user.subscription.status == 'active')
            )
        except:
            user_is_vip = False
    
    # ✅ NUEVO: Filtro por rango de tiempo (EXCLUYENDO día actual)
    time_range = request.GET.get('time_range')
    if time_range:
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        if time_range == '24h':
            cutoff_date = now - timedelta(hours=24)
            surveys = surveys.filter(created_at__gte=cutoff_date, created_at__lt=now)
        elif time_range == '3d':
            cutoff_date = (now - timedelta(days=3)).replace(hour=0, minute=0, second=0, microsecond=0)
            surveys = surveys.filter(created_at__gte=cutoff_date, created_at__lt=today_start)
        elif time_range == '1w':
            cutoff_date = (now - timedelta(weeks=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            surveys = surveys.filter(created_at__gte=cutoff_date, created_at__lt=today_start)
        elif time_range == '1m':
            cutoff_date = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
            surveys = surveys.filter(created_at__gte=cutoff_date, created_at__lt=today_start)
        elif time_range == '1y':
            cutoff_date = (now - timedelta(days=365)).replace(hour=0, minute=0, second=0, microsecond=0)
            surveys = surveys.filter(created_at__gte=cutoff_date, created_at__lt=today_start)
        elif time_range == '3m_ranking':
            cutoff_date = (now - timedelta(days=90)).replace(hour=0, minute=0, second=0, microsecond=0)
            surveys = surveys.filter(created_at__gte=cutoff_date, created_at__lt=today_start)
    
    # Aplicar filtros para TODOS los usuarios
    country = request.GET.get('country')
    if country:
        surveys = surveys.filter(creator__profile__country=country)
    
    age_min = request.GET.get('ageMin')
    age_max = request.GET.get('ageMax')
    if age_min:
        try:
            surveys = surveys.filter(creator__profile__age__gte=int(age_min))
        except ValueError:
            pass
    if age_max:
        try:
            surveys = surveys.filter(creator__profile__age__lte=int(age_max))
        except ValueError:
            pass
    
    gender = request.GET.get('gender')
    if gender:
        if gender == 'A':
            # ✅ FIX: Filtrar encuestas anónimas
            surveys = surveys.filter(creator_gender='A')
        elif gender in ['M', 'F']:
            surveys = surveys.filter(creator_gender=gender)
    
    # Filtro NSFW
    show_nsfw_param = request.GET.get('show_nsfw', 'false')
    show_nsfw = show_nsfw_param.lower() == 'true'
    
    if show_nsfw:
        surveys = surveys.filter(is_nsfw=True)
    else:
        surveys = surveys.filter(is_nsfw=False)
    
    # Ordenar por fecha de creación
    surveys = surveys.order_by('-created_at')
    
    # ✅ PAGINACIÓN: Implementar PageNumberPagination
    page_number = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 20)), 100)  # Max 100 por página
    
    paginator = Paginator(surveys, page_size)
    total_pages = paginator.num_pages
    total_count = paginator.count
    
    try:
        page_obj = paginator.page(page_number)
    except EmptyPage:
        # Si la página no existe, devolver la última página
        page_obj = paginator.page(total_pages) if total_pages > 0 else paginator.page(1)
    
    return Response({
        'surveys': [_serialize_survey(s, request.user) for s in page_obj],
        'pagination': {
            'current_page': page_obj.number,
            'total_pages': total_pages,
            'total_count': total_count,
            'page_size': page_size,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'next_page': page_obj.next_page_number() if page_obj.has_next() else None,
            'previous_page': page_obj.previous_page_number() if page_obj.has_previous() else None,
        },
        'filters_applied': {
            'country': request.GET.get('country'),
            'age_range': f"{request.GET.get('ageMin', '')}-{request.GET.get('ageMax', '')}".strip('-'),
            'gender': request.GET.get('gender'),
            'show_nsfw': show_nsfw,
            'nsfw_mode': 'exclusive_nsfw' if show_nsfw else 'safe_only',
            'time_range': time_range,
            'user_is_vip': user_is_vip,
        }
    })


@require_http_methods(["GET"])
def api_verified_profiles(request):
    """
    Obtiene todos los perfiles de usuarios verificados.
    Solo devuelve usuarios que tengan is_verified=True.
    """
    from ..models.user_profile import UserProfile
    
    # Filtrar solo usuarios verificados y activos
    verified_profiles = UserProfile.objects.filter(
        is_verified=True,
        user__is_active=True
    ).select_related('user')
    
    profiles_data = []
    for profile in verified_profiles:
        profiles_data.append({
            'id': profile.user.id,
            'username': profile.user.username,
            'email': profile.user.email,
            'full_name': profile.get_full_name(),
            'first_name': profile.first_name,
            'last_name': profile.last_name,
            'country': {
                'code': str(profile.country) if profile.country else None,
                'name': profile.country.name if profile.country else None,
            } if profile.country else None,
            'age': profile.age,
            'is_verified': profile.is_verified,
            'created_at': profile.user.date_joined.isoformat(),
        })
    
    return JsonResponse({
        'profiles': profiles_data,
        'total': len(profiles_data)
    })


@api_view(['GET'])
@permission_classes([])  # Permitir acceso anónimo
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_survey_detail(request, pk: int):
    try:
        survey = get_object_or_404(Survey, pk=pk, is_active=True)
        questions = survey.questions.all().prefetch_related('choices')
        
        # ✅ NUEVO: Incrementar contador de vistas
        survey.views_count += 1
        survey.save(update_fields=['views_count'])
        
        # ✅ FIX: Registrar visualización ÚNICA (evitar duplicados en menos de 1 minuto)
        if request.user.is_authenticated:
            from ..models.survey_view import SurveyView
            from datetime import timedelta
            
            # Verificar si ya existe una visita reciente (menos de 1 minuto)
            one_minute_ago = timezone.now() - timedelta(minutes=1)
            recent_view = SurveyView.objects.filter(
                user=request.user,
                survey=survey,
                viewed_at__gte=one_minute_ago
            ).exists()
            
            # Solo crear si no hay visita reciente
            if not recent_view:
                SurveyView.objects.create(
                    user=request.user,
                    survey=survey
                )
                print(f"DEBUG: Nueva visita registrada - Usuario: {request.user.username}, Encuesta: {survey.id}", file=sys.stderr)
            else:
                print(f"DEBUG: Visita duplicada ignorada - Usuario: {request.user.username}, Encuesta: {survey.id}", file=sys.stderr)
        
        # Obtener estadísticas de países
        country_stats = {}
        
        return Response({
            'survey': _serialize_survey(survey, request.user),
            'questions': [_serialize_question(q) for q in questions],
            'country_stats': country_stats,
        })
    except Exception as e:
        return Response({
            'error': f'Error obteniendo detalles de encuesta: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_survey_delete(request, pk: int):
    """
    Elimina una encuesta (soft delete). Solo el creador puede eliminar su propia encuesta.
    ✅ SOFT DELETE: Marca is_active=False en lugar de eliminar de la BD
    """
    try:
        survey = get_object_or_404(Survey, pk=pk)
        
        # ✅ VERIFICAR PERMISOS: Solo el creador puede eliminar
        if survey.creator != request.user:
            return Response({
                'error': 'No tienes permisos para eliminar esta encuesta',
                'detail': 'Solo el creador puede eliminar su propia encuesta'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # ✅ SOFT DELETE: Marcar como inactiva en lugar de eliminar
        survey_title = survey.title
        survey_id = survey.id
        
        with transaction.atomic():
            # Marcar encuesta como inactiva
            survey.is_active = False
            survey.save(update_fields=['is_active'])
            
            # ✅ OPCIONAL: Eliminar notificaciones relacionadas para limpiar
            deleted_notifications = Notification.objects.filter(survey=survey).delete()
        
        return Response({
            'success': True,
            'message': f'Encuesta "{survey_title}" eliminada exitosamente',
            'deleted_survey_id': survey_id,
            'deleted_notifications': deleted_notifications[0] if deleted_notifications else 0,
        })
        
    except Exception as e:
        return Response({
            'error': f'Error eliminando encuesta: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([])  # Permitir acceso anónimo y autenticado
@authentication_classes([TokenAuthentication, SessionAuthentication])
@csrf_exempt  # ← CRÍTICO: Permitir requests sin CSRF token
def api_submit_response(request, pk: int):
    survey = get_object_or_404(Survey, pk=pk, is_active=True)

    # Manejar tanto JSON como form data
    if request.content_type == 'application/json':
        import json
        payload = json.loads(request.body)
    else:
        payload = request.POST

    with transaction.atomic():
        # ✅ NUEVO: Unificar todo como comentarios
        user = request.user if request.user.is_authenticated else None
        
        # ✅ NUEVO: Obtener identidad dinámica si se proporciona
        response_identity = payload.get('response_identity', {})
        if isinstance(response_identity, str):
            import json
            try:
                response_identity = json.loads(response_identity)
            except:
                response_identity = {}
        

        
        # Construir el contenido del comentario con todas las respuestas
        comment_parts = []
        
        # Procesar respuestas a preguntas
        for q in survey.questions.all():
            key = f'question_{q.id}'
            answer_text = None
            
            if q.type in ['radio', 'select', 'scale']:
                choice_id = payload.get(key)
                if choice_id:
                    try:
                        choice = Choice.objects.get(pk=int(choice_id), question=q)
                        answer_text = f"**{q.text}**: {choice.text}"
                    except (ValueError, Choice.DoesNotExist):
                        continue
            elif q.type == 'checkbox':
                selected = payload.get(key, [])
                if isinstance(selected, str):
                    selected = [selected]
                choices_text = []
                for cid in selected:
                    try:
                        choice = Choice.objects.get(pk=int(cid), question=q)
                        choices_text.append(choice.text)
                    except (ValueError, Choice.DoesNotExist):
                        continue
                if choices_text:
                    answer_text = f"**{q.text}**: {', '.join(choices_text)}"
            else:  # text, textarea
                text = payload.get(key, '').strip()
                if text:
                    answer_text = f"**{q.text}**: {text}"
            
            if answer_text:
                comment_parts.append(answer_text)
        
        # Agregar comentario general si existe
        general_comment = payload.get('general_comment', '').strip()
        if general_comment:
            comment_parts.append(general_comment)  # ← SIN PREFIJO, mensaje puro
        
        # Si no hay contenido, crear un comentario por defecto
        if not comment_parts:
            comment_parts.append("Respuesta enviada sin contenido específico.")
        
        # Crear comentario unificado
        comment_content = '\n\n'.join(comment_parts)
        
        comment = Comment.objects.create(
            survey=survey,
            author=user,
            content=comment_content,
            parent=None,  # Es un comentario principal, no una respuesta
            # ✅ NUEVO: Guardar identidad dinámica como JSON
            dynamic_identity=response_identity if response_identity else None
        )

        # ✅ FIX 3: NOTIFICACIÓN con CASCADE - Solo para respuestas (comentarios principales)
        if survey.creator and survey.creator != user:
            try:
                respondent_name = user.username if user else "Usuario anónimo"
                message = f"Nueva respuesta de {respondent_name} en tu encuesta '{survey.title}'"
                Notification.objects.create(
                    user=survey.creator,
                    message=message,
                    survey=survey,  # ✅ FIX 3: Usar ForeignKey en lugar de survey_id
                    notification_type='response'
                )
            except Exception as e:
                pass  # Silenciar errores de notificación


    return Response({
        'ok': True, 
        'comment_id': comment.id,
        'message': 'Respuesta enviada exitosamente como comentario',
        'notification_sent': True,
        'dynamic_identity_saved': bool(response_identity)
    })


def _serialize_notification(n: Notification):
    return {
        'id': n.id,
        'message': n.message,
        'is_read': n.is_read,
        'created_at': n.created_at.isoformat(),
        'survey_id': n.survey_id,  # ✅ NUEVO: ID de encuesta para navegación
        'notification_type': n.notification_type if hasattr(n, 'notification_type') else 'general',  # ✅ NUEVO: Tipo
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_notifications(request):
    """
    Obtiene las notificaciones del usuario autenticado.
    Query params:
    - unread_only: si es 'true', solo devuelve notificaciones no leídas
    - limit: número máximo de notificaciones a devolver (default: 20)
    """
    notifications = Notification.objects.filter(user=request.user)
    
    # Filtrar solo no leídas si se especifica
    if request.GET.get('unread_only', '').lower() == 'true':
        notifications = notifications.filter(is_read=False)
    
    # Limitar resultados
    limit = int(request.GET.get('limit', 20))
    notifications = notifications[:limit]
    
    return Response({
        'notifications': [_serialize_notification(n) for n in notifications],
        'unread_count': Notification.objects.filter(user=request.user, is_read=False).count()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_mark_notification_read(request, notification_id: int):
    """
    Marca una notificación específica como leída
    """
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.mark_as_read()
    
    return Response({
        'success': True,
        'notification': _serialize_notification(notification)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_mark_all_notifications_read(request):
    """
    Marca todas las notificaciones del usuario como leídas
    """
    updated_count = Notification.objects.filter(
        user=request.user, 
        is_read=False
    ).update(is_read=True)
    
    return Response({
        'success': True,
        'updated_count': updated_count
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_delete_notification(request, notification_id: int):
    """
    Elimina una notificación específica del usuario
    """
    try:
        notification = get_object_or_404(
            Notification, 
            id=notification_id, 
            user=request.user
        )
        notification.delete()
        
        return Response({
            'success': True,
            'message': 'Notificación eliminada exitosamente'
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Error al eliminar notificación: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_delete_all_notifications(request):
    """
    Elimina todas las notificaciones del usuario
    """
    try:
        deleted_count, _ = Notification.objects.filter(user=request.user).delete()
        
        return Response({
            'success': True,
            'deleted_count': deleted_count,
            'message': f'{deleted_count} notificaciones eliminadas exitosamente'
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Error al eliminar notificaciones: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
def _serialize_comment(c: Comment):
    # ✅ CRÍTICO: Implementar lógica de máscara de anonimato
    is_anonymous = c.dynamic_identity and not c.dynamic_identity.get('showRealName', True)
    
    # ✅ CRÍTICO: Obtener estado VIP del autor
    author_is_vip = False
    if c.author:
        try:
            author_is_vip = c.author.profile.is_vip if hasattr(c.author, 'profile') else False
        except:
            author_is_vip = False
    
    return {
        'id': c.id,
        'content': c.content,
        'created_at': c.created_at.isoformat(),
        'updated_at': c.updated_at.isoformat(),
        'is_edited': c.is_edited,
        'is_reply': c.is_reply,
        'replies_count': c.replies_count,
        'time_since': c.get_time_since_created(),
        'author': {
            # ✅ CRÍTICO: Si es anónimo, NUNCA mostrar username real
            'username': "anonimo" if is_anonymous else (c.author.username if c.author else None),
            'display_name': "Usuario anónimo" if is_anonymous else c.get_author_display_name(),
            'full_name': "" if is_anonymous else c.get_author_full_name(),
            # ✅ NUEVO: Usar identidad dinámica si está disponible
            'gender': c.get_dynamic_gender(),
            'age': c.get_dynamic_age(),
            'country': {
                'code': str(c.get_author_country()) if c.get_author_country() and not is_anonymous else None,
                'name': c.get_author_country().name if c.get_author_country() and not is_anonymous else None,
            } if c.get_author_country() and not is_anonymous else None,
            'is_vip': author_is_vip,  # ✅ NUEVO: Campo VIP para el diamante
        },
        'parent_id': c.parent.id if c.parent else None,
        # ✅ FIX RECURSIVIDAD: Serializar replies SIEMPRE (no solo si not c.is_reply)
        'replies': [_serialize_comment(reply) for reply in c.get_thread_comments()],
    }


@api_view(['GET'])
@permission_classes([])  # Permitir acceso anónimo
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_survey_comments(request, pk: int):
    """
    Obtiene todos los comentarios de una encuesta
    """
    try:
        survey = get_object_or_404(Survey, pk=pk, is_active=True)
        
        # Obtener solo comentarios principales (no respuestas)
        comments = Comment.objects.filter(
            survey=survey, 
            parent=None
        ).select_related('author', 'author__profile').prefetch_related('replies__author__profile').order_by('-created_at')
        
        # ✅ CRÍTICO: Log anonimizado - NO exponer nombres reales

        for comment in comments:
            # Respetar anonimato en logs
            is_anonymous = comment.dynamic_identity and not comment.dynamic_identity.get('showRealName', True)
            author_display = "Usuario anónimo" if is_anonymous else (comment.author.username if comment.author else "Usuario anónimo")

        
        return Response({
            'comments': [_serialize_comment(c) for c in comments],
            'total_comments': Comment.objects.filter(survey=survey).count(),
        })
        
    except Exception as e:
        pass  # Error silenciado
        return Response({
            'error': f'Error obteniendo comentarios: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def api_create_comment(request, pk: int):
    """
    Crea un nuevo comentario en una encuesta
    """
    survey = get_object_or_404(Survey, pk=pk, is_active=True)
    
    try:
        data = request.data  # Con @api_view usamos request.data en lugar de json.loads(request.body)
        content = data.get('content', '').strip()
        parent_id = data.get('parent_id')
        # ✅ NUEVO: Obtener identidad dinámica del comentario
        comment_identity = data.get('comment_identity', {})
        
        if not content:
            return JsonResponse({
                'success': False,
                'error': 'El contenido del comentario es requerido.'
            }, status=400)
        
        if len(content) > 1000:
            return JsonResponse({
                'success': False,
                'error': 'El comentario no puede exceder 1000 caracteres.'
            }, status=400)
        
        # Verificar comentario padre si es una respuesta
        parent_comment = None
        if parent_id:
            try:
                parent_comment = Comment.objects.get(id=parent_id, survey=survey)
                # ✅ PERMITIR RESPUESTAS INFINITAS - Eliminada restricción
            except Comment.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Comentario padre no encontrado.'
                }, status=404)
        
        # Crear comentario
        comment = Comment.objects.create(
            survey=survey,
            author=request.user,
            parent=parent_comment,
            content=content,
            # ✅ NUEVO: Guardar identidad dinámica
            dynamic_identity=comment_identity if comment_identity else None
        )
        

        
        # ✅ CRÍTICO: Crear notificación respetando anonimato
        if survey.creator and survey.creator != request.user:
            # Determinar si el comentario es anónimo
            is_anonymous = comment_identity and not comment_identity.get('showRealName', True)
            
            if is_anonymous:
                message = f"Un usuario anónimo comentó en tu encuesta '{survey.title}'"
                if parent_comment:
                    message = f"Un usuario anónimo respondió a un comentario en tu encuesta '{survey.title}'"
            else:
                message = f"Nuevo comentario en tu encuesta '{survey.title}' por {request.user.username}"
                if parent_comment:
                    message = f"Nueva respuesta a un comentario en tu encuesta '{survey.title}' por {request.user.username}"
            
            Notification.objects.create(
                user=survey.creator,
                message=message,
                survey=survey,  # ✅ FIX 3: Usar ForeignKey
                notification_type='comment'
            )
        
        # ✅ CRÍTICO: Si es una respuesta, notificar al autor del comentario original respetando anonimato
        if parent_comment and parent_comment.author != request.user and parent_comment.author != survey.creator:
            is_anonymous = comment_identity and not comment_identity.get('showRealName', True)
            
            if is_anonymous:
                message = f"Un usuario anónimo respondió a tu comentario en '{survey.title}'"
            else:
                message = f"{request.user.username} respondió a tu comentario en '{survey.title}'"
                
            Notification.objects.create(
                user=parent_comment.author,
                message=message,
                survey=survey,  # ✅ FIX 3: Usar ForeignKey
                notification_type='comment'
            )
        
        return JsonResponse({
            'success': True,
            'comment': _serialize_comment(comment)
        }, status=201)  # Status 201 para creación exitosa
        
    except Exception as e:
        pass  # Error silenciado
        return JsonResponse({
            'success': False,
            'error': f'Error al crear comentario: {str(e)}'
        }, status=500)


@api_view(['PUT'])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def api_update_comment(request, pk: int, comment_id: int):
    """
    Actualiza un comentario existente
    """
    survey = get_object_or_404(Survey, pk=pk, is_active=True)
    comment = get_object_or_404(Comment, id=comment_id, survey=survey)
    
    if not comment.can_edit(request.user):
        return JsonResponse({
            'success': False,
            'error': 'No tienes permisos para editar este comentario.'
        }, status=403)
    
    try:
        data = request.data  # Con @api_view usamos request.data
        content = data.get('content', '').strip()
        
        if not content:
            return JsonResponse({
                'success': False,
                'error': 'El contenido del comentario es requerido.'
            }, status=400)
        
        if len(content) > 1000:
            return JsonResponse({
                'success': False,
                'error': 'El comentario no puede exceder 1000 caracteres.'
            }, status=400)
        
        comment.content = content
        comment.is_edited = True
        comment.save()
        
        return JsonResponse({
            'success': True,
            'comment': _serialize_comment(comment)
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error al actualizar comentario: {str(e)}'
        }, status=500)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def api_delete_comment(request, pk: int, comment_id: int):
    """
    Elimina un comentario
    """
    survey = get_object_or_404(Survey, pk=pk, is_active=True)
    comment = get_object_or_404(Comment, id=comment_id, survey=survey)
    
    if not comment.can_delete(request.user):
        return JsonResponse({
            'success': False,
            'error': 'No tienes permisos para eliminar este comentario.'
        }, status=403)
    
    comment.delete()
    
    return JsonResponse({
        'success': True,
        'message': 'Comentario eliminado exitosamente.'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_report_content(request):
    """
    Reporta contenido (encuesta o comentario)
    """
    try:
        data = request.data
        content_type_name = data.get('content_type')
        object_id = data.get('object_id')
        reason = data.get('reason')
        description = data.get('description', '').strip()
        
        # Validaciones
        if not all([content_type_name, object_id, reason]):
            missing = []
            if not content_type_name:
                missing.append('content_type')
            if not object_id:
                missing.append('object_id')
            if not reason:
                missing.append('reason')
            
            return Response({
                'success': False,
                'error': f'Campos requeridos faltantes: {", ".join(missing)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if reason not in dict(Report.REASON_CHOICES):
            return Response({
                'success': False,
                'error': f'Motivo de reporte inválido: {reason}. Opciones válidas: {list(dict(Report.REASON_CHOICES).keys())}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener el ContentType
        try:
            if content_type_name == 'survey':
                content_type = ContentType.objects.get_for_model(Survey)
                content_object = Survey.objects.get(id=object_id)
            elif content_type_name == 'comment':
                content_type = ContentType.objects.get_for_model(Comment)
                content_object = Comment.objects.get(id=object_id)
            else:
                return Response({
                    'success': False,
                    'error': 'Tipo de contenido no válido.'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (Survey.DoesNotExist, Comment.DoesNotExist):
            return Response({
                'success': False,
                'error': 'Contenido no encontrado.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verificar que no sea el propio contenido
        if content_type_name == 'survey' and content_object.creator == request.user:
            return Response({
                'success': False,
                'error': 'No puedes reportar tu propia encuesta.'
            }, status=status.HTTP_400_BAD_REQUEST)
        elif content_type_name == 'comment' and content_object.author == request.user:
            return Response({
                'success': False,
                'error': 'No puedes reportar tu propio comentario.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar si ya reportó este contenido
        existing_report = Report.objects.filter(
            reporter=request.user,
            content_type=content_type,
            object_id=object_id
        ).first()
        
        if existing_report:
            return Response({
                'success': False,
                'error': 'Ya has reportado este contenido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Crear reporte
        report = Report.objects.create(
            reporter=request.user,
            content_type=content_type,
            object_id=object_id,
            reason=reason,
            description=description,
        )
        
        # ✅ NUEVO: Incrementar contador de reportes del autor del contenido
        content_author = None
        if content_type_name == 'survey':
            content_author = content_object.creator
        elif content_type_name == 'comment':
            content_author = content_object.author
        
        if content_author and hasattr(content_author, 'profile'):
            report_count = content_author.profile.increment_report_count()
            
            # Log de moderación
            import sys
            print(f'[MODERATION] Usuario {content_author.username} reportado', file=sys.stderr)
            
            # ✅ NUEVO: Crear notificación para el autor del contenido reportado
            try:
                if content_type_name == 'survey':
                    message = f"Tu encuesta '{content_object.title}' ha sido reportada. Nuestro equipo la revisará pronto."
                elif content_type_name == 'comment':
                    comment_preview = content_object.content[:50] + '...' if len(content_object.content) > 50 else content_object.content
                    message = f"Tu comentario '{comment_preview}' ha sido reportado. Nuestro equipo lo revisará pronto."
                
                Notification.objects.create(
                    user=content_author,
                    message=message
                )
                print(f'[NOTIFICATION] Notificación enviada a {content_author.username}', file=sys.stderr)
            except Exception as notif_error:
                print(f'[NOTIFICATION ERROR] Error al crear notificación: {notif_error}', file=sys.stderr)
            print(f'[MODERATION] Total de reportes: {report_count}', file=sys.stderr)
            
            if report_count >= 8:
                print(f'[MODERATION] Usuario {content_author.username} SUSPENDIDO automáticamente', file=sys.stderr)
                
                # Notificar al usuario suspendido
                Notification.objects.create(
                    user=content_author,
                    message=f"Tu cuenta ha sido suspendida por 3 días debido a múltiples reportes. Total: {report_count} reportes."
                )
        
        # Crear notificación para administradores
        admin_users = User.objects.filter(is_staff=True)
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                message=f"Nuevo reporte de {request.user.username}: {report.get_reason_display()} - {report.content_type_name}"
            )
        
        return Response({
            'success': True,
            'message': 'Reporte enviado exitosamente. Será revisado por nuestro equipo.',
            'report_id': report.id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f'❌ [REPORT BACKEND] Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'error': f'Error al enviar reporte: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@require_http_methods(["GET"])
@login_required
def api_user_reports(request):
    """
    Obtiene los reportes realizados por el usuario actual
    """
    reports = Report.objects.filter(reporter=request.user).select_related(
        'content_type', 'reviewed_by'
    )
    
    reports_data = []
    for report in reports:
        reports_data.append({
            'id': report.id,
            'content_type': report.content_type_name,
            'content_preview': report.reported_content_preview,
            'reason': report.get_reason_display(),
            'status': report.get_status_display(),
            'created_at': report.created_at.isoformat(),
            'reviewed_at': report.reviewed_at.isoformat() if report.reviewed_at else None,
            'admin_notes': report.admin_notes,
        })
    
    return JsonResponse({
        'reports': reports_data,
        'total_reports': len(reports_data)
    })


# ============================================================================
# APIS DE SUSCRIPCIONES VIP
# ============================================================================

@require_http_methods(["GET"])
def api_subscription_plans(request):
    """
    Obtiene los planes de suscripción disponibles
    """
    plans = [
        {
            'type': 'monthly',
            'id': 'monthly',
            'name': 'Plan Mensual',
            'price': 5.00,
            'currency': 'PEN',
            'duration': '1 mes',
            'features': [
                '✨ Insignia VIP dorada',
                '📊 Análisis avanzados de encuestas',
                '🎭 GIFs en comentarios',
                '🔥 Prioridad en soporte',
                '📈 Estadísticas detalladas'
            ],
            'popular': False
        },
        {
            'type': 'quarterly',
            'id': 'quarterly',
            'name': 'Plan Trimestral',
            'price': 12.00,
            'currency': 'PEN',
            'duration': '3 meses',
            'savings': '20%',
            'features': [
                '✨ Insignia VIP dorada',
                '📊 Análisis avanzados de encuestas',
                '🎭 GIFs en comentarios',
                '🔥 Prioridad en soporte',
                '📈 Estadísticas detalladas',
                '💎 Acceso a plantillas premium'
            ],
            'popular': True
        },
        {
            'type': 'annual',
            'id': 'annual',
            'name': 'Plan Anual',
            'price': 35.00,
            'currency': 'PEN',
            'duration': '12 meses',
            'savings': '42%',
            'features': [
                '✨ Insignia VIP dorada',
                '📊 Análisis avanzados de encuestas',
                '🎭 GIFs en comentarios',
                '🔥 Prioridad en soporte',
                '📈 Estadísticas detalladas',
                '💎 Acceso a plantillas premium',
                '🎯 Análisis de tendencias',
                '🏆 Badge de usuario fundador'
            ],
            'popular': False
        }
    ]
    
    return JsonResponse({
        'plans': plans,
        'currency_symbol': 'S/'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_user_subscription(request):
    """
    Obtiene la suscripción actual del usuario
    """
    try:
        subscription = request.user.subscription
        
        # Actualizar estado VIP del perfil
        request.user.profile.update_vip_status()
        
        subscription_data = {
            'id': subscription.id,
            'plan_type': subscription.plan_type,
            'plan_name': subscription.get_plan_type_display(),
            'status': subscription.status,
            'status_display': subscription.get_status_display(),
            'price': float(subscription.price),
            'payment_method': subscription.payment_method,
            'is_active': subscription.is_active,
            'is_pending_review': subscription.is_pending_review,
            'has_proof': bool(subscription.payment_proof),
            'days_remaining': subscription.days_remaining,
            'start_date': subscription.start_date.isoformat(),
            'end_date': subscription.end_date.isoformat() if subscription.end_date else None,
            'created_at': subscription.created_at.isoformat(),
        }
        
        return JsonResponse({
            'has_subscription': True,
            'subscription': subscription_data,
            'is_vip': request.user.profile.is_vip
        })
        
    except Subscription.DoesNotExist:
        return JsonResponse({
            'has_subscription': False,
            'subscription': None,
            'is_vip': False
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_create_subscription(request):
    """
    Crear una nueva suscripción para el usuario
    """
    try:
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        plan_type = data.get('plan_type')
        payment_method = data.get('payment_method', 'online')
        transaction_id = data.get('transaction_id', '')
        
        if plan_type not in ['monthly', 'quarterly', 'annual']:
            return JsonResponse({
                'success': False,
                'error': 'Tipo de plan inválido'
            }, status=400)
        
        if payment_method not in ['yape', 'bcp', 'paypal', 'online']:
            return JsonResponse({
                'success': False,
                'error': 'Método de pago inválido'
            }, status=400)
        
        # Crear suscripción
        subscription = Subscription.create_subscription(
            request.user, 
            plan_type, 
            payment_method, 
            transaction_id
        )
        
        # Si es pago manual, queda pendiente de aprobación
        if payment_method in ['yape', 'bcp']:
            message = f'Suscripción {subscription.get_plan_type_display()} creada. Sube tu comprobante para activarla.'
            status_code = 'pending'
        else:
            # Para pago online, activar automáticamente (demo)
            subscription.activate_subscription()
            message = f'¡Suscripción {subscription.get_plan_type_display()} activada exitosamente!'
            status_code = 'active'
        
        # Actualizar estado VIP del usuario
        request.user.profile.update_vip_status()
        
        return JsonResponse({
            'success': True,
            'message': message,
            'subscription': {
                'id': subscription.id,
                'plan_type': subscription.plan_type,
                'plan_name': subscription.get_plan_type_display(),
                'price': float(subscription.price),
                'payment_method': subscription.payment_method,
                'status': subscription.status,
                'is_active': subscription.is_active,
                'is_pending_review': subscription.is_pending_review,
                'days_remaining': subscription.days_remaining,
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error al crear suscripción: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_upload_payment_proof(request):
    """
    Subir comprobante de pago para suscripción pendiente
    """
    try:
        # ✅ CRÍTICO: DEBUG anonimizado - usar ID en lugar de username





        
        # Obtener suscripción pendiente del usuario
        subscription = Subscription.objects.filter(
            user=request.user,
            status='pending'
        ).first()
        

        
        if not subscription:

            return JsonResponse({
                'success': False,
                'error': 'No tienes una suscripción pendiente de pago'
            }, status=400)
        
        # Verificar que se subió un archivo
        if 'payment_proof' not in request.FILES:


            return JsonResponse({
                'success': False,
                'error': 'Debes subir un comprobante de pago'
            }, status=400)
        
        # Guardar el comprobante
        subscription.payment_proof = request.FILES['payment_proof']

        
        # Actualizar transaction_id si se proporciona
        transaction_id = request.POST.get('transaction_id', '') or request.data.get('transaction_id', '')
        if transaction_id:
            subscription.transaction_id = transaction_id

        
        subscription.save()

        
        return JsonResponse({
            'success': True,
            'message': 'Comprobante subido exitosamente. Tu pago está en revisión.',
            'subscription': {
                'id': subscription.id,
                'plan_name': subscription.get_plan_type_display(),
                'price': float(subscription.price),
                'payment_method': subscription.payment_method,
                'status': subscription.status,
                'is_pending_review': subscription.is_pending_review,
                'has_proof': bool(subscription.payment_proof),
            }
        })
        
    except Exception as e:
        pass  # Error silenciado
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': f'Error al subir comprobante: {str(e)}'
        }, status=500)


@require_http_methods(["POST"])
@login_required
@csrf_exempt
def api_paypal_verify_payment(request):
    """
    Verificar pago de PayPal y activar suscripción VIP
    """
    try:
        data = json.loads(request.body)
        order_id = data.get('orderID')
        plan_type = data.get('plan_type')
        
        if not order_id:
            return JsonResponse({
                'success': False,
                'error': 'OrderID de PayPal requerido'
            }, status=400)
        
        if plan_type not in ['monthly', 'quarterly', 'annual']:
            return JsonResponse({
                'success': False,
                'error': 'Tipo de plan inválido'
            }, status=400)
        
        # Verificar el pago con PayPal
        verification_result = verify_paypal_payment(order_id)
        
        if not verification_result['success']:
            return JsonResponse({
                'success': False,
                'error': verification_result['error']
            }, status=400)
        
        # Verificar que el monto coincida con el plan
        expected_prices = Subscription.get_plan_prices()
        expected_amount = expected_prices[plan_type]
        paid_amount = float(verification_result['amount'])
        
        if abs(paid_amount - expected_amount) > 0.01:  # Tolerancia de 1 centavo
            return JsonResponse({
                'success': False,
                'error': f'Monto pagado (${paid_amount}) no coincide con el plan (${expected_amount})'
            }, status=400)
        
        # Crear y activar suscripción
        subscription = Subscription.create_subscription(
            user=request.user,
            plan_type=plan_type,
            payment_method='paypal',
            transaction_id=order_id
        )
        
        # Activar inmediatamente para PayPal
        subscription.activate_subscription()
        subscription.admin_notes = f'Pago verificado con PayPal. OrderID: {order_id}'
        subscription.save()
        
        # Actualizar estado VIP del usuario
        request.user.profile.update_vip_status()
        
        return JsonResponse({
            'success': True,
            'message': f'¡Pago verificado! Suscripción {subscription.get_plan_type_display()} activada.',
            'subscription': {
                'id': subscription.id,
                'plan_type': subscription.plan_type,
                'plan_name': subscription.get_plan_type_display(),
                'price': float(subscription.price),
                'payment_method': subscription.payment_method,
                'status': subscription.status,
                'is_active': subscription.is_active,
                'days_remaining': subscription.days_remaining,
                'transaction_id': subscription.transaction_id,
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error verificando pago PayPal: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_yape_payment(request):
    """
    Procesar pago con Yape para usuarios peruanos
    
    Body esperado:
    {
        "phone_number": "9XXXXXXXX",
        "amount": 2.70,
        "plan": "mensual"
    }
    
    Respuesta simulada (mock por ahora):
    {
        "status": "pending",
        "transaction_id": "YAPE-XXXXXX",
        "message": "Pago Yape iniciado. Confirma en tu app."
    }
    """
    try:
        data = request.data
        phone_number = data.get('phone_number', '').strip()
        amount = data.get('amount')
        plan = data.get('plan', '').strip()
        
        # Validaciones
        if not phone_number:
            return Response({
                'success': False,
                'error': 'El número de celular es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not phone_number.isdigit() or len(phone_number) != 9:
            return Response({
                'success': False,
                'error': 'El número debe tener exactamente 9 dígitos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not amount or float(amount) <= 0:
            return Response({
                'success': False,
                'error': 'El monto es inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not plan:
            return Response({
                'success': False,
                'error': 'El plan es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar que el usuario es peruano
        user = request.user
        if not hasattr(user, 'profile') or str(user.profile.country) != 'PE':
            return Response({
                'success': False,
                'error': 'Yape solo está disponible para usuarios de Perú'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Generar transaction_id único
        import uuid
        transaction_id = f"YAPE-{uuid.uuid4().hex[:8].upper()}"
        
        # TODO: Aquí iría la integración real con la API de Yape
        # Por ahora, devolver respuesta simulada (mock)
        
        return Response({
            'success': True,
            'status': 'pending',
            'transaction_id': transaction_id,
            'message': 'Pago Yape iniciado. Confirma en tu app.',
            'phone_number': phone_number,
            'amount': float(amount),
            'plan': plan
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Error procesando pago Yape: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@require_http_methods(["POST"])
@login_required
@csrf_exempt
def api_paypal_verify_payment(request):
    """
    Verificar pago de PayPal y activar suscripción VIP
    """
    try:
        data = json.loads(request.body)
        order_id = data.get('orderID')
        plan_type = data.get('plan_type')
        
        if not order_id:
            return JsonResponse({
                'success': False,
                'error': 'OrderID de PayPal requerido'
            }, status=400)
        
        if plan_type not in ['monthly', 'quarterly', 'annual']:
            return JsonResponse({
                'success': False,
                'error': 'Tipo de plan inválido'
            }, status=400)
        
        # Verificar el pago con PayPal
        verification_result = verify_paypal_payment(order_id)
        
        if not verification_result['success']:
            return JsonResponse({
                'success': False,
                'error': verification_result['error']
            }, status=400)
        
        # Verificar que el monto coincida con el plan
        expected_prices = Subscription.get_plan_prices()
        expected_amount = expected_prices[plan_type]
        paid_amount = float(verification_result['amount'])
        
        if abs(paid_amount - expected_amount) > 0.01:  # Tolerancia de 1 centavo
            return JsonResponse({
                'success': False,
                'error': f'Monto pagado (${paid_amount}) no coincide con el plan (${expected_amount})'
            }, status=400)
        
        # Crear y activar suscripción
        subscription = Subscription.create_subscription(
            user=request.user,
            plan_type=plan_type,
            payment_method='paypal',
            transaction_id=order_id
        )
        
        # Activar inmediatamente para PayPal
        subscription.activate_subscription()
        subscription.admin_notes = f'Pago verificado con PayPal. OrderID: {order_id}'
        subscription.save()
        
        # Actualizar estado VIP del usuario
        request.user.profile.update_vip_status()
        
        return JsonResponse({
            'success': True,
            'message': f'¡Pago verificado! Suscripción {subscription.get_plan_type_display()} activada.',
            'subscription': {
                'id': subscription.id,
                'plan_type': subscription.plan_type,
                'plan_name': subscription.get_plan_type_display(),
                'price': float(subscription.price),
                'payment_method': subscription.payment_method,
                'status': subscription.status,
                'is_active': subscription.is_active,
                'days_remaining': subscription.days_remaining,
                'transaction_id': subscription.transaction_id,
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error verificando pago PayPal: {str(e)}'
        }, status=500)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error verificando pago PayPal: {str(e)}'
        }, status=500)


def verify_paypal_payment(order_id):
    """
    Verificar un pago de PayPal usando su API
    """
    try:
        import requests
        from django.conf import settings
        
        # Obtener token de acceso de PayPal
        auth_response = requests.post(
            f'{settings.PAYPAL_API_BASE}/v1/oauth2/token',
            headers={
                'Accept': 'application/json',
                'Accept-Language': 'en_US',
            },
            data='grant_type=client_credentials',
            auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET)
        )
        
        if auth_response.status_code != 200:
            return {
                'success': False,
                'error': 'Error obteniendo token de PayPal'
            }
        
        access_token = auth_response.json()['access_token']
        
        # Verificar la orden
        order_response = requests.get(
            f'{settings.PAYPAL_API_BASE}/v2/checkout/orders/{order_id}',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}',
            }
        )
        
        if order_response.status_code != 200:
            return {
                'success': False,
                'error': 'Error verificando orden de PayPal'
            }
        
        order_data = order_response.json()
        
        # Verificar que el pago esté completado
        if order_data.get('status') != 'COMPLETED':
            return {
                'success': False,
                'error': f'Pago no completado. Estado: {order_data.get("status")}'
            }
        
        # Obtener el monto pagado
        purchase_units = order_data.get('purchase_units', [])
        if not purchase_units:
            return {
                'success': False,
                'error': 'No se encontraron unidades de compra'
            }
        
        amount = purchase_units[0].get('amount', {}).get('value', '0')
        
        return {
            'success': True,
            'amount': amount,
            'currency': purchase_units[0].get('amount', {}).get('currency_code', 'USD'),
            'order_data': order_data
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Error en verificación PayPal: {str(e)}'
        }


@require_http_methods(["POST"])
@login_required
@csrf_exempt
def api_cancel_subscription(request):
    """
    Cancelar la suscripción actual del usuario
    """
    try:
        subscription = request.user.subscription
        subscription.cancel_subscription()
        
        # Actualizar estado VIP del usuario
        request.user.profile.update_vip_status()
        
        return JsonResponse({
            'success': True,
            'message': 'Suscripción cancelada exitosamente'
        })
        
    except Subscription.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'No tienes una suscripción activa'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error al cancelar suscripción: {str(e)}'
        }, status=500)




# ==========================================
# PANEL DE ADMINISTRACIÓN - SUSCRIPCIONES
# ==========================================

@require_http_methods(["GET"])
@login_required
def api_admin_pending_subscriptions(request):
    """
    Obtener suscripciones pendientes para administradores
    """
    # Verificar que el usuario sea staff
    if not request.user.is_staff:
        return JsonResponse({
            'success': False,
            'error': 'No tienes permisos de administrador'
        }, status=403)
    
    try:
        # Obtener suscripciones pendientes
        pending_subscriptions = Subscription.objects.filter(
            status='pending'
        ).select_related('user', 'user__profile').order_by('-created_at')
        
        subscriptions_data = []
        for subscription in pending_subscriptions:
            user_profile = subscription.user.profile
            
            subscription_data = {
                'id': subscription.id,
                'user': {
                    'id': subscription.user.id,
                    'username': subscription.user.username,
                    'email': subscription.user.email,
                    'full_name': user_profile.get_full_name() if user_profile else subscription.user.username,
                    'country': str(user_profile.country) if user_profile and user_profile.country else None,
                },
                'plan': {
                    'type': subscription.plan_type,
                    'name': subscription.get_plan_type_display(),
                    'price': float(subscription.price),
                },
                'payment': {
                    'method': subscription.payment_method,
                    'method_name': subscription.get_payment_method_display(),
                    'transaction_id': subscription.transaction_id,
                    'has_proof': bool(subscription.payment_proof),
                    'proof_url': subscription.payment_proof.url if subscription.payment_proof else None,
                },
                'dates': {
                    'created_at': subscription.created_at.isoformat(),
                    'updated_at': subscription.updated_at.isoformat(),
                },
                'status': subscription.status,
                'admin_notes': subscription.admin_notes,
            }
            
            subscriptions_data.append(subscription_data)
        
        return JsonResponse({
            'success': True,
            'subscriptions': subscriptions_data,
            'count': len(subscriptions_data)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error obteniendo suscripciones: {str(e)}'
        }, status=500)


@require_http_methods(["POST"])
@login_required
@csrf_exempt
def api_admin_approve_subscription(request):
    """
    Aprobar suscripción pendiente
    """
    # Verificar que el usuario sea staff
    if not request.user.is_staff:
        return JsonResponse({
            'success': False,
            'error': 'No tienes permisos de administrador'
        }, status=403)
    
    try:
        data = json.loads(request.body)
        subscription_id = data.get('subscription_id')
        admin_notes = data.get('admin_notes', '')
        
        if not subscription_id:
            return JsonResponse({
                'success': False,
                'error': 'ID de suscripción requerido'
            }, status=400)
        
        # Obtener suscripción
        subscription = get_object_or_404(Subscription, id=subscription_id)
        
        if subscription.status != 'pending':
            return JsonResponse({
                'success': False,
                'error': 'La suscripción no está pendiente de aprobación'
            }, status=400)
        
        # Aprobar pago y activar suscripción
        with transaction.atomic():
            success = subscription.approve_payment()
            
            if success:
                # Agregar notas del admin
                if admin_notes:
                    subscription.admin_notes = admin_notes
                    subscription.save()
                
                # Actualizar estado VIP del usuario
                subscription.user.profile.update_vip_status()
                
                # Enviar email de felicitación
                send_vip_welcome_email(subscription.user)
                
                return JsonResponse({
                    'success': True,
                    'message': 'Suscripción aprobada exitosamente',
                    'subscription': {
                        'id': subscription.id,
                        'status': subscription.status,
                        'user_is_vip': subscription.user.profile.is_vip,
                        'start_date': subscription.start_date.isoformat(),
                        'end_date': subscription.end_date.isoformat(),
                        'days_remaining': subscription.days_remaining,
                    }
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Error aprobando la suscripción'
                }, status=500)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error aprobando suscripción: {str(e)}'
        }, status=500)


@require_http_methods(["POST"])
@login_required
@csrf_exempt
def api_admin_reject_subscription(request):
    """
    Rechazar suscripción pendiente
    """
    # Verificar que el usuario sea staff
    if not request.user.is_staff:
        return JsonResponse({
            'success': False,
            'error': 'No tienes permisos de administrador'
        }, status=403)
    
    try:
        data = json.loads(request.body)
        subscription_id = data.get('subscription_id')
        reason = data.get('reason', 'Pago rechazado por el administrador')
        
        if not subscription_id:
            return JsonResponse({
                'success': False,
                'error': 'ID de suscripción requerido'
            }, status=400)
        
        # Obtener suscripción
        subscription = get_object_or_404(Subscription, id=subscription_id)
        
        if subscription.status != 'pending':
            return JsonResponse({
                'success': False,
                'error': 'La suscripción no está pendiente de aprobación'
            }, status=400)
        
        # Rechazar pago
        subscription.reject_payment(reason)
        
        # Actualizar estado VIP del usuario
        subscription.user.profile.update_vip_status()
        
        # Enviar email de notificación (opcional)
        send_payment_rejected_email(subscription.user, reason)
        
        return JsonResponse({
            'success': True,
            'message': 'Suscripción rechazada',
            'subscription': {
                'id': subscription.id,
                'status': subscription.status,
                'user_is_vip': subscription.user.profile.is_vip,
                'admin_notes': subscription.admin_notes,
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Datos JSON inválidos'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error rechazando suscripción: {str(e)}'
        }, status=500)


def send_vip_welcome_email(user):
    """
    Enviar email de bienvenida VIP
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        # Obtener nombre del usuario
        full_name = user.profile.get_full_name() if hasattr(user, 'profile') else user.username
        
        subject = '🎉 ¡Felicidades! Ya eres miembro VIP de Cuestom'
        
        # Mensaje HTML profesional
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: linear-gradient(45deg, #667eea, #764ba2, #ffd700); padding: 30px; border-radius: 15px; text-align: center; color: white; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 32px; font-weight: bold;">🎉 ¡FELICIDADES!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Ya eres miembro VIP de Cuestom</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0; font-size: 24px;">¡Hola {full_name}!</h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                    Tu pago ha sido <strong style="color: #4caf50;">aprobado exitosamente</strong> y ahora eres oficialmente un miembro VIP de Cuestom.
                </p>
                
                <div style="background: linear-gradient(45deg, #ffd700, #ffed4e); padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0; border: 2px solid #ffc107;">
                    <h3 style="color: #333; margin: 0; font-size: 20px;">✨ BENEFICIOS VIP ACTIVADOS ✨</h3>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h4 style="color: #333; margin-top: 0;">🚀 Ahora puedes disfrutar de:</h4>
                    <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                        <li><strong>Encuestas ilimitadas</strong> - Crea tantas como necesites</li>
                        <li><strong>Análisis avanzados</strong> - Estadísticas detalladas</li>
                        <li><strong>Soporte prioritario</strong> - Atención preferencial</li>
                        <li><strong>Funciones exclusivas</strong> - Acceso a herramientas premium</li>
                        <li><strong>Sin publicidad</strong> - Experiencia limpia y profesional</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/vip" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                        🎯 Explorar Beneficios VIP
                    </a>
                </div>
                
                <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #1976d2; margin: 0; font-size: 14px;">
                        <strong>💡 Tip:</strong> Tu estado VIP se ha activado automáticamente. ¡Ya puedes disfrutar de todas las funciones premium!
                    </p>
                </div>
                
                <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="color: #999; font-size: 14px; margin: 0;">
                        Gracias por confiar en Cuestom para tus encuestas profesionales.
                    </p>
                    <p style="color: #667eea; font-weight: bold; margin: 10px 0 0 0; font-size: 16px;">
                        🚀 ¡El futuro de las encuestas es VIP!
                    </p>
                </div>
            </div>
        </div>
        """
        
        # Mensaje de texto plano como fallback
        plain_message = f"""
        🎉 ¡FELICIDADES! Ya eres miembro VIP de Cuestom
        
        Hola {full_name},
        
        Tu pago ha sido aprobado exitosamente y ahora eres oficialmente un miembro VIP de Cuestom.
        
        ✨ BENEFICIOS VIP ACTIVADOS:
        
        🚀 Ahora puedes disfrutar de:
        • Encuestas ilimitadas - Crea tantas como necesites
        • Análisis avanzados - Estadísticas detalladas  
        • Soporte prioritario - Atención preferencial
        • Funciones exclusivas - Acceso a herramientas premium
        • Sin publicidad - Experiencia limpia y profesional
        
        Tu estado VIP se ha activado automáticamente. ¡Ya puedes disfrutar de todas las funciones premium!
        
        Visita: http://localhost:3000/vip
        
        Gracias por confiar en Cuestom para tus encuestas profesionales.
        
        🚀 ¡El futuro de las encuestas es VIP!
        
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
        
        return True
        
    except Exception as e:
        pass  # Error silenciado
        return False


@require_http_methods(["GET"])
@login_required
def api_admin_stats(request):
    """
    Obtener estadísticas para el dashboard de administrador
    """
    # Verificar que el usuario sea staff
    if not request.user.is_staff:
        return JsonResponse({
            'success': False,
            'error': 'No tienes permisos de administrador'
        }, status=403)
    
    try:
        from django.contrib.auth.models import User
        
        # Estadísticas de usuarios
        total_users = User.objects.filter(is_active=True).count()
        verified_users = User.objects.filter(
            is_active=True,
            profile__is_verified=True
        ).count()
        
        # Estadísticas de suscripciones
        active_subscriptions = Subscription.objects.filter(
            status='active'
        ).count()
        
        pending_subscriptions = Subscription.objects.filter(
            status='pending'
        ).count()
        
        # Estadísticas de reportes
        pending_reports = Report.objects.filter(
            status='pending'
        ).count()
        
        total_reports = Report.objects.count()
        
        # Estadísticas de encuestas
        total_surveys = Survey.objects.count()
        active_surveys = Survey.objects.filter(is_active=True).count()
        
        # Estadísticas de respuestas
        # from ..models.response import Response as SurveyResponse  # ← COMENTADO: Sistema unificado
        # total_responses = SurveyResponse.objects.count()
        total_responses = Comment.objects.filter(parent=None).count()  # ← NUEVO: Usar comentarios principales
        
        return JsonResponse({
            'success': True,
            'stats': {
                'users': {
                    'total': total_users,
                    'verified': verified_users,
                    'verification_rate': round((verified_users / total_users * 100) if total_users > 0 else 0, 1)
                },
                'subscriptions': {
                    'active': active_subscriptions,
                    'pending': pending_subscriptions,
                    'total': active_subscriptions + pending_subscriptions
                },
                'reports': {
                    'pending': pending_reports,
                    'total': total_reports,
                    'resolved': total_reports - pending_reports
                },
                'surveys': {
                    'total': total_surveys,
                    'active': active_surveys,
                    'inactive': total_surveys - active_surveys
                },
                'responses': {
                    'total': total_responses,
                    'average_per_survey': round(total_responses / total_surveys if total_surveys > 0 else 0, 1)
                }
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error obteniendo estadísticas: {str(e)}'
        }, status=500)


def send_payment_rejected_email(user, reason):
    """
    Enviar email de pago rechazado
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        full_name = user.profile.get_full_name() if hasattr(user, 'profile') else user.username
        
        subject = 'Cuestom - Información sobre tu pago VIP'
        
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(45deg, #667eea, #764ba2); padding: 30px; border-radius: 15px; text-align: center; color: white; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📋 Cuestom</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Información sobre tu pago VIP</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0;">Hola {full_name},</h2>
                
                <p style="color: #666; line-height: 1.6;">
                    Hemos revisado tu comprobante de pago para la suscripción VIP, pero lamentablemente no pudimos aprobarlo en esta ocasión.
                </p>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0;">
                        <strong>Motivo:</strong> {reason}
                    </p>
                </div>
                
                <p style="color: #666; line-height: 1.6;">
                    No te preocupes, puedes intentar nuevamente subiendo un nuevo comprobante de pago desde tu panel VIP.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/vip" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                        Intentar Nuevamente
                    </a>
                </div>
                
                <p style="color: #999; font-size: 14px; text-align: center;">
                    Si tienes dudas, contacta a nuestro equipo de soporte.
                </p>
            </div>
        </div>
        """
        
        plain_message = f"""
        Cuestom - Información sobre tu pago VIP
        
        Hola {full_name},
        
        Hemos revisado tu comprobante de pago para la suscripción VIP, pero lamentablemente no pudimos aprobarlo en esta ocasión.
        
        Motivo: {reason}
        
        No te preocupes, puedes intentar nuevamente subiendo un nuevo comprobante de pago desde tu panel VIP.
        
        Visita: http://localhost:3000/vip
        
        Si tienes dudas, contacta a nuestro equipo de soporte.
        
        Equipo Cuestom
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True
        
    except Exception as e:
        pass  # Error silenciado
        return False


# ==========================================
# NUEVOS ENDPOINTS PARA CREACIÓN Y PERFIL
# ==========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_create_survey(request):
    """
    Crear nueva encuesta con soporte para imágenes (solo VIP)
    ✅ LÍMITE VIP: 6 encuestas diarias para usuarios gratuitos, ilimitado para VIP
    """
    try:
        from django.core.cache import cache
        from datetime import timedelta
        
        user_id = request.user.id
        
        # ✅ VERIFICAR SI ES VIP (con manejo robusto de errores)
        user_is_vip = False
        try:
            if request.user.is_authenticated and hasattr(request.user, 'profile'):
                profile = request.user.profile
                user_is_vip = profile.is_vip if hasattr(profile, 'is_vip') else False
                
                # Verificar también suscripción activa
                if not user_is_vip and hasattr(request.user, 'subscription'):
                    subscription = request.user.subscription
                    user_is_vip = (
                        hasattr(subscription, 'is_active') and 
                        subscription.is_active and 
                        hasattr(subscription, 'status') and
                        subscription.status == 'active'
                    )
        except Exception as e:
            # Si falla la verificación VIP, asumir que NO es VIP (más seguro)
            user_is_vip = False
        
        # ✅ LÍMITE DIARIO: Solo para usuarios NO VIP - ESTRICTO (5 encuestas)
        if not user_is_vip:
            try:
                from django.utils import timezone
                import datetime
                
                # ✅ FIX BLINDADO: Obtener el momento actual
                now = timezone.now()
                
                # SI por alguna razón es naive, lo forzamos a ser aware
                if timezone.is_naive(now):
                    now = timezone.make_aware(now, timezone.get_current_timezone())
                
                # Ahora sí, convertimos a local con total seguridad
                now_local = timezone.localtime(now)
                today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
                
                # Contar encuestas creadas desde medianoche de hoy
                today_surveys_count = Survey.objects.filter(
                    creator=request.user,
                    created_at__gte=today_start
                ).count()
                
                # ✅ CRÍTICO: BLOQUEAR si tiene 5 o más
                if today_surveys_count >= 5:
                    return Response({
                        'success': False,
                        'error': 'Has alcanzado el límite de 5 encuestas diarias. ¡Espera hasta mañana o sube a VIP!',
                        'limit_reached': True,
                        'is_vip': False,
                        'current_count': today_surveys_count
                    }, status=status.HTTP_403_FORBIDDEN)
                
            except Exception as limit_error:
                # Si falla el conteo, BLOQUEAR por seguridad
                import sys
                print(f'[LIMIT ERROR] Error al verificar límite: {limit_error}', file=sys.stderr)
                import traceback
                traceback.print_exc(file=sys.stderr)
                print(f'[LIMIT ERROR] Usuario: {request.user.username} - BLOQUEADO por seguridad', file=sys.stderr)
                # ✅ UX: Devolver mensaje claro en lugar de error técnico
                return Response({
                    'success': False,
                    'error': 'Has alcanzado el límite de 5 encuestas diarias. ¡Espera hasta mañana o sube a VIP!',
                    'limit_error': True
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Obtener datos del formulario
        if request.content_type and 'multipart/form-data' in request.content_type:
            title = request.data.get('title', '').strip()
            description = request.data.get('description', '').strip()
            creator_identity_str = request.data.get('creator_identity', '{}')
            is_nsfw = request.data.get('is_nsfw', 'false').lower() == 'true'
            expires_in = request.data.get('expires_in', '')  # ✅ NUEVO: Auto-destrucción VIP
            image_file = request.FILES.get('image') if user_is_vip else None
            
            import json
            try:
                creator_identity = json.loads(creator_identity_str) if isinstance(creator_identity_str, str) else creator_identity_str
            except:
                creator_identity = {}
        else:
            data = request.data
            title = data.get('title', '').strip()
            description = data.get('description', '').strip()
            creator_identity = data.get('creator_identity', {})
            is_nsfw = data.get('is_nsfw', False)
            expires_in = data.get('expires_in', '')  # ✅ NUEVO: Auto-destrucción VIP
            image_file = None
        
        # Validar datos requeridos
        if not description:
            return Response({
                'success': False,
                'error': 'El contenido principal es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar límite de caracteres
        if len(description) > 1000:
            return Response({
                'success': False,
                'error': 'El contenido no puede exceder 1000 caracteres'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener género del creator_identity PRIMERO, luego del perfil como fallback
        current_gender = 'A'
        try:
            if creator_identity and creator_identity.get('gender'):
                current_gender = creator_identity.get('gender')
            elif hasattr(request.user, 'profile') and hasattr(request.user.profile, 'gender') and request.user.profile.gender:
                current_gender = request.user.profile.gender
        except:
            current_gender = 'A'
        
        # Crear la encuesta
        survey_data = {
            'title': title or 'Encuesta sin título',
            'description': description,
            'creator': request.user,
            'creator_gender': current_gender,
            'is_active': True,
            'is_nsfw': is_nsfw
        }
        
        # ✅ NUEVO: Auto-destrucción VIP
        if expires_in and user_is_vip:
            from datetime import timedelta
            from django.utils import timezone as tz  # Import explícito para evitar conflictos
            if expires_in == '24h':
                survey_data['expires_at'] = tz.now() + timedelta(hours=24)
            elif expires_in == '48h':
                survey_data['expires_at'] = tz.now() + timedelta(hours=48)
            elif expires_in == '72h':
                survey_data['expires_at'] = tz.now() + timedelta(hours=72)
        
        # Agregar imagen si es VIP y se proporcionó
        if image_file and user_is_vip:
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
            if image_file.content_type not in allowed_types:
                return Response({
                    'success': False,
                    'error': 'Solo se permiten archivos PNG y JPG'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if image_file.size > 5 * 1024 * 1024:
                return Response({
                    'success': False,
                    'error': 'La imagen no puede exceder 5MB'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            survey_data['image'] = image_file
        
        survey = Survey.objects.create(**survey_data)
        
        if creator_identity:
            survey.creator_identity = creator_identity
            survey.save()
        
        # Guardar identidad del creador si se proporciona
        if creator_identity:
            profile = request.user.profile
            if creator_identity.get('gender'):
                profile.gender = creator_identity['gender']
            if creator_identity.get('age'):
                try:
                    profile.age = int(creator_identity['age'])
                except (ValueError, TypeError):
                    pass
            profile.save()
        
        return Response({
            'success': True,
            'message': 'Encuesta creada exitosamente',
            'survey': {
                'id': survey.id,
                'title': survey.title,
                'description': survey.description,
                'is_active': survey.is_active,
                'created_at': survey.created_at.isoformat(),
                'image_url': survey.image.url if survey.image else None,
                'creator': {
                    'username': survey.creator.username,
                    'display_name': creator_identity.get('showRealName', True) and survey.creator.username or 'Anónimo'
                }
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Error creando encuesta: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_user_surveys(request):
    """
    Obtener TODAS las encuestas del usuario logueado (sin límite de paginación)
    """
    import sys
    
    try:
        # ✅ DEBUG: Log del usuario que hace la petición
        print(f'[API_USER_SURVEYS] Usuario: {request.user.username} (ID: {request.user.id})', file=sys.stderr)
        
        # ✅ FIX: Filtrar solo encuestas activas (is_active=True)
        surveys = Survey.objects.filter(
            creator=request.user,
            is_active=True
        ).order_by('-created_at')
        
        print(f'[API_USER_SURVEYS] Encuestas encontradas: {surveys.count()}', file=sys.stderr)
        
        surveys_data = []
        for survey in surveys:
            surveys_data.append({
                'id': survey.id,
                'title': survey.title,
                'description': survey.description,
                'is_active': survey.is_active,
                'created_at': survey.created_at.isoformat(),
                'response_count': survey.response_set.count(),
            })
        
        # ✅ NUEVO: Mensaje claro si no hay encuestas
        if len(surveys_data) == 0:
            return Response({
                'success': True,
                'surveys': [],
                'total': 0,
                'message': 'Aún no has creado encuestas'
            })
        
        return Response({
            'success': True,
            'surveys': surveys_data,
            'total': len(surveys_data)
        })
        
    except Exception as e:
        print(f'[API_USER_SURVEYS ERROR] {str(e)}', file=sys.stderr)
        return Response({
            'success': False,
            'error': f'Error obteniendo encuestas: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def api_survey_like(request, pk: int):
    """
    Dar like/dislike a una encuesta o remover voto
    """
    survey = get_object_or_404(Survey, pk=pk, is_active=True)
    
    try:
        data = request.data
        action = data.get('action')  # 'like', 'dislike', o 'remove'
        
        if action not in ['like', 'dislike', 'remove']:
            return JsonResponse({
                'success': False,
                'error': 'Acción inválida. Debe ser "like", "dislike" o "remove".'
            }, status=400)
        
        user = request.user
        
        # Remover like/dislike previo si existe
        if user in survey.liked_by.all():
            survey.liked_by.remove(user)
            survey.likes_count = max(0, survey.likes_count - 1)
        
        if user in survey.disliked_by.all():
            survey.disliked_by.remove(user)
            survey.dislikes_count = max(0, survey.dislikes_count - 1)
        
        # ✅ NUEVO: Si la acción es 'remove', solo quitar el voto sin agregar uno nuevo
        if action != 'remove':
            # Agregar nuevo like/dislike
            if action == 'like':
                survey.liked_by.add(user)
                survey.likes_count += 1
                user_action = 'liked'
            else:  # dislike
                survey.disliked_by.add(user)
                survey.dislikes_count += 1
                user_action = 'disliked'
        
        survey.save()
        
        # ✅ CRÍTICO: Log anonimizado - usar ID en lugar de username


        
        return JsonResponse({
            'success': True,
            'likes_count': survey.likes_count,
            'dislikes_count': survey.dislikes_count,
            'user_liked': user in survey.liked_by.all(),
            'user_disliked': user in survey.disliked_by.all(),
        }, status=200)
        
    except Exception as e:
        pass  # Error silenciado
        return JsonResponse({
            'success': False,
            'error': f'Error al procesar like/dislike: {str(e)}'
        }, status=500)



# ==========================================
# ENDPOINT: ELIMINAR CUENTA DE USUARIO
# ==========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_delete_account(request):
    """
    Eliminar cuenta de usuario
    Requiere contraseña para confirmar
    """
    try:
        from django.contrib.auth import authenticate
        
        # Obtener contraseña del request
        password = request.data.get('password', '')
        
        if not password:
            return Response({
                'success': False,
                'error': 'La contraseña es requerida'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar contraseña
        user = authenticate(username=request.user.username, password=password)
        
        if not user:
            return Response({
                'success': False,
                'error': 'Contraseña incorrecta'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Guardar username antes de eliminar
        username = user.username
        
        # ✅ CRÍTICO: Eliminar el objeto user autenticado, NO request.user
        user.delete()
        
        return Response({
            'success': True,
            'message': f'Cuenta de {username} eliminada exitosamente'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import sys
        print(f'[DELETE ACCOUNT ERROR] {str(e)}', file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        return Response({
            'success': False,
            'error': f'Error al eliminar cuenta: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_vip_karma_reward(request):
    """
    Otorgar +2 karma al creador de una encuesta cuando un VIP responde
    ✅ FIX: Guardar el feedback VIP en el modelo VipFeedbackSubmission
    """
    try:
        # ✅ CRÍTICO: Verificar autenticación PRIMERO
        if not request.user.is_authenticated:
            return Response({
                'success': False,
                'error': 'Usuario no autenticado'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        data = request.data
        survey_id = data.get('survey_id')
        question1 = data.get('question1', '')
        question2 = data.get('question2', '')
        
        if not survey_id:
            return Response({
                'success': False,
                'error': 'survey_id es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar que las respuestas tengan contenido
        if len(question1) < 10 or len(question2) < 10:
            return Response({
                'success': False,
                'error': 'Ambas respuestas deben tener al menos 10 caracteres'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar que el usuario actual es VIP
        vip_user = request.user
        if not hasattr(vip_user, 'profile') or not vip_user.profile.is_vip:
            return Response({
                'success': False,
                'error': 'Solo usuarios VIP pueden otorgar karma'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Obtener la encuesta
        survey = Survey.objects.select_related('creator', 'creator__profile').get(id=survey_id)
        
        # Verificar que el VIP no sea el creador
        if survey.creator == vip_user:
            return Response({
                'success': False,
                'error': 'No puedes otorgarte karma a ti mismo'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ NUEVO: Verificar si ya envió feedback (unique_together)
        from ..models.vip_feedback import VipFeedbackSubmission
        existing_feedback = VipFeedbackSubmission.objects.filter(
            survey=survey,
            vip_user=vip_user
        ).first()
        
        if existing_feedback:
            return Response({
                'success': False,
                'error': 'Ya has enviado feedback VIP para esta encuesta'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ NUEVO: Guardar el feedback VIP
        VipFeedbackSubmission.objects.create(
            survey=survey,
            vip_user=vip_user,
            question1_answer=question1[:500],
            question2_answer=question2[:500]
        )
        
        # Otorgar +2 karma al creador
        creator_profile = survey.creator.profile
        creator_profile.karma += 2
        creator_profile.save()
        
        # ✅ FIX 1 & 3: Crear notificación VIP específica con CASCADE
        Notification.objects.create(
            user=survey.creator,
            notification_type='vip_karma',
            message=f'¡Felicidades! Has recibido +2 Karma por la respuesta de un miembro VIP en "{survey.title}". Total: {creator_profile.karma} puntos 🌟',
            survey=survey
        )
        
        return Response({
            'success': True,
            'message': 'Karma otorgado exitosamente',
            'creator_karma': creator_profile.karma
        }, status=status.HTTP_200_OK)
        
    except Survey.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Encuesta no encontrada'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH', 'POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_update_profile(request):
    """
    Actualizar perfil del usuario
    """
    import sys
    import traceback
    
    try:
        # ✅ CRÍTICO: Verificar autenticación PRIMERO
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'error': 'Usuario no autenticado. Por favor inicia sesión.'
            }, status=401)
        
        # ✅ CRÍTICO: Forzar evaluación de SimpleLazyObject
        user = request.user._wrapped if hasattr(request.user, '_wrapped') else request.user
        
        if not user or not user.id:
            return JsonResponse({
                'success': False,
                'error': 'Usuario inválido. Por favor inicia sesión nuevamente.'
            }, status=401)
        
        # ✅ CRÍTICO: Verificar que el perfil existe
        from ..models.user_profile import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        # ✅ Manejar tanto JSON como FormData (multipart)
        if request.content_type and 'multipart/form-data' in request.content_type:
            if 'profile_image' in request.FILES:
                profile.profile_image = request.FILES['profile_image']
        else:
            try:
                data = json.loads(request.body) if request.body else {}
            except json.JSONDecodeError:
                data = request.POST.dict() if hasattr(request, 'POST') else {}
            
            # Actualizar campos con validación
            if 'first_name' in data:
                profile.first_name = str(data['first_name'])[:100]
                
            if 'last_name' in data:
                profile.last_name = str(data['last_name'])[:100]
                
            if 'age' in data:
                try:
                    profile.age = int(data['age']) if data['age'] else None
                except (ValueError, TypeError):
                    pass
                    
            if 'country' in data:
                profile.country = data['country'] if data['country'] else None
                
            if 'phone_number' in data:
                profile.phone_number = str(data['phone_number'])[:20] if data['phone_number'] else None
                
            if 'gender' in data:
                profile.gender = data['gender'] if data['gender'] in ['M', 'F', 'O', 'N'] else None
        
        profile.save()
        
        profile_image_url = profile.profile_image.url if profile.profile_image else None
        
        return JsonResponse({
            'success': True,
            'message': 'Perfil actualizado exitosamente',
            'profile': {
                'first_name': profile.first_name,
                'last_name': profile.last_name,
                'age': profile.age,
                'country': str(profile.country) if profile.country else None,
                'phone_number': profile.phone_number,
                'gender': profile.gender,
                'karma': profile.karma,
                'is_vip': profile.is_vip,
                'profile_image': profile_image_url,
            }
        })
        
    except json.JSONDecodeError as e:
        print(f'[UPDATE_PROFILE ERROR] JSON inválido: {e}', file=sys.stderr)
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': f'JSON inválido: {str(e)}'
        }, status=400)
        
    except Exception as e:
        print(f'[UPDATE_PROFILE ERROR] Error inesperado: {e}', file=sys.stderr)
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': f'Error al actualizar perfil: {str(e)}',
            'error_type': type(e).__name__,
            'error_line': traceback.format_exc()
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_vip_karma_stats(request):
    """
    Obtener estadísticas VIP: Usuarios únicos a los que el VIP actual ha ayudado
    """
    try:
        # Verificar autenticación
        if not request.user.is_authenticated:
            return Response({
                'success': False,
                'error': 'Usuario no autenticado'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # ✅ FIX: Verificar que el usuario es VIP de forma segura
        try:
            is_vip = request.user.profile.is_vip if hasattr(request.user, 'profile') else False
        except:
            is_vip = False
        
        if not is_vip:
            return Response({
                'success': False,
                'error': 'Solo usuarios VIP pueden acceder a estas estadísticas',
                'is_vip': False
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Contar usuarios únicos a los que el VIP actual ha ayudado
        from ..models.vip_feedback import VipFeedbackSubmission
        unique_users = VipFeedbackSubmission.objects.filter(
            vip_user=request.user
        ).values('survey__creator').distinct().count()
        
        return Response({
            'success': True,
            'unique_users_helped': unique_users,
            'is_vip': True
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_update_nickname(request):
    """
    Actualizar el apodo (username) del usuario con cooldown de 30 días
    """
    import sys
    from datetime import timedelta
    
    try:
        if not request.user.is_authenticated:
            return Response({
                'success': False,
                'error': 'Usuario no autenticado'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        data = request.data
        new_nickname = data.get('new_nickname', '').strip()
        
        if not new_nickname:
            return Response({
                'success': False,
                'error': 'El apodo no puede estar vacío'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_nickname) > 25:
            return Response({
                'success': False,
                'error': 'El apodo no puede tener más de 25 caracteres'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar que el username no esté en uso
        if User.objects.filter(username=new_nickname).exclude(id=request.user.id).exists():
            return Response({
                'success': False,
                'error': 'Este apodo ya está en uso por otro usuario'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener o crear perfil
        from ..models.user_profile import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # ✅ COOLDOWN VIP: 7 días para VIP, 30 días para usuarios comunes
        cooldown_days = 7 if profile.is_vip else 30
        
        if profile.last_username_change:
            days_since_change = (timezone.now() - profile.last_username_change).days
            if days_since_change < cooldown_days:
                days_remaining = cooldown_days - days_since_change
                vip_message = " (beneficio VIP)" if profile.is_vip else ""
                return Response({
                    'success': False,
                    'error': f'Debes esperar {days_remaining} días más para cambiar tu apodo nuevamente{vip_message}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ FIX CRÍTICO: Actualizar username del User, NO first_name del Profile
        request.user.username = new_nickname
        request.user.save()
        
        # Actualizar timestamp del último cambio
        profile.last_username_change = timezone.now()
        profile.save()
        
        # Actualizar localStorage del usuario
        user_data = {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_vip': profile.is_vip,
        }
        
        print(f'[API_UPDATE_NICKNAME] Usuario cambió username a: {new_nickname}', file=sys.stderr)
        
        return Response({
            'success': True,
            'message': 'Apodo actualizado exitosamente. Los cambios se aplicarán a futuras encuestas y comentarios.',
            'nickname': new_nickname,
            'user': user_data,
            'next_change_available': (timezone.now() + timedelta(days=30)).isoformat()
        })
        
    except Exception as e:
        print(f'[API_UPDATE_NICKNAME ERROR] {str(e)}', file=sys.stderr)
        return Response({
            'success': False,
            'error': f'Error actualizando apodo: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_user_view_stats(request):
    """
    Obtiene las estadísticas de visualizaciones del usuario autenticado
    """
    import sys
    from django.db.models import Sum
    from datetime import datetime, timedelta
    
    try:
        from ..models.survey_view import SurveyView
        
        user = request.user
        
        # ✅ FIX: Usar hora local de Perú (UTC-5) para todas las comparaciones
        now = timezone.localtime(timezone.now())
        
        # ✅ NUEVO: Calcular total de vistas a las encuestas del usuario
        total_survey_views = Survey.objects.filter(
            creator=user
        ).aggregate(Sum('views_count'))['views_count__sum'] or 0
        
        print(f"DEBUG: Hora local (Perú UTC-5): {now}", file=sys.stderr)
        print(f"DEBUG: Total de vistas a encuestas del usuario {user.username}: {total_survey_views}", file=sys.stderr)
        
        # ✅ FIX: Contar PARTICIPACIÓN (comentarios en encuestas únicas), no visitas
        # Usar Comment.objects para contar encuestas en las que el usuario participó
        from ..models.comment import Comment
        
        views_today = Comment.objects.filter(
            author=user,  # ✅ FIX: Usar 'author' en lugar de 'user'
            created_at__date=now.date()
        ).values('survey').distinct().count()
        
        # Semana actual (desde el lunes)
        current_day = now.weekday()  # 0 = Lunes, 6 = Domingo
        week_start = (now - timedelta(days=current_day)).date()
        
        views_week = Comment.objects.filter(
            author=user,  # ✅ FIX: Usar 'author' en lugar de 'user'
            created_at__date__gte=week_start
        ).values('survey').distinct().count()
        
        # Mes actual
        month_start = now.replace(day=1).date()
        
        views_month = Comment.objects.filter(
            author=user,  # ✅ FIX: Usar 'author' en lugar de 'user'
            created_at__date__gte=month_start
        ).values('survey').distinct().count()
        
        # Año actual
        year_start = now.replace(month=1, day=1).date()
        
        views_year = Comment.objects.filter(
            author=user,  # ✅ FIX: Usar 'author' en lugar de 'user'
            created_at__date__gte=year_start
        ).values('survey').distinct().count()
        
        # ✅ FIX: Semana CALENDARIO ACTUAL (Lunes 23 a Domingo 29 de marzo 2026)
        # Calcular el lunes de la semana actual usando hora local
        today = now.date()
        days_since_monday = today.weekday()  # 0=Lunes, 6=Domingo
        monday_of_week = today - timedelta(days=days_since_monday)
        
        print(f"DEBUG: Hoy es {today} (hora local Perú), Lunes de esta semana: {monday_of_week}", file=sys.stderr)
        
        daily_views = []
        day_names = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
        
        for i in range(7):
            day_date = monday_of_week + timedelta(days=i)
            
            # ✅ FIX: Incluir HOY en la consulta (<=) en lugar de solo días pasados (<)
            if day_date <= today:
                # ✅ CORRECCIÓN CRÍTICA: Contar COMENTARIOS (participación), no SurveyView
                # Contar encuestas únicas en las que el usuario comentó ese día
                from ..models.comment import Comment
                count = Comment.objects.filter(
                    author=user,  # ✅ FIX: Usar 'author' en lugar de 'user'
                    created_at__date=day_date
                ).values('survey').distinct().count()
                
                print(f"DEBUG: {day_date} ({day_names[i]}): Consultando BD - {count} encuestas con comentarios", file=sys.stderr)
            else:
                # Día futuro = 0 (sin consulta a BD)
                count = 0
                print(f"DEBUG: {day_date} ({day_names[i]}): Día futuro - 0 comentarios", file=sys.stderr)
            
            daily_views.append({
                'date': day_date.strftime('%Y-%m-%d'),
                'day_name': day_names[i],
                'day_number': day_date.day,
                'weekday': i + 1,  # 1=Lunes, 7=Domingo
                'count': count,
                'is_future': day_date > today  # ✅ Solo días ESTRICTAMENTE mayores son futuros
            })
        
        print(f"DEBUG: Total de participación (comentarios) hoy para usuario {user.username}: {views_today}", file=sys.stderr)
        print(f"DEBUG: Daily participation array: {daily_views}", file=sys.stderr)
        
        return Response({
            'success': True,
            'stats': {
                'today': views_today,
                'this_week': views_week,
                'this_month': views_month,
                'this_year': views_year,
                'total_survey_views': total_survey_views,  # ✅ Total de vistas a encuestas
            },
            'daily_views': daily_views,
            'week_info': {
                'start': monday_of_week.strftime('%Y-%m-%d'),
                'end': (monday_of_week + timedelta(days=6)).strftime('%Y-%m-%d'),
                'current_date': today.strftime('%Y-%m-%d'),  # ✅ Fecha actual local
            }
        })
        
    except Exception as e:
        print(f"ERROR en api_user_view_stats: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return Response({
            'error': f'Error obteniendo estadísticas: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_user_survey_stats(request):
    """
    Obtiene estadísticas de encuestas del usuario autenticado
    Incluye: total histórico, activas, eliminadas, y conteo diario histórico
    """
    try:
        user = request.user
        
        # Contar encuestas activas del usuario
        active_surveys = Survey.objects.filter(
            creator=user,
            is_active=True
        ).count()
        
        # Contar encuestas eliminadas (soft delete)
        deleted_surveys = Survey.objects.filter(
            creator=user,
            is_active=False
        ).count()
        
        # Total histórico
        total_surveys = active_surveys + deleted_surveys
        
        # ✅ NUEVO: Conteo diario histórico (TODAS las encuestas, sin filtrar por is_active)
        # Esto permite que el gráfico muestre el esfuerzo realizado cada día
        now = timezone.localtime(timezone.now())
        today = now.date()
        days_since_monday = today.weekday()  # 0=Lunes, 6=Domingo
        monday_of_week = today - timedelta(days=days_since_monday)
        
        daily_survey_counts = []
        day_names = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
        
        for i in range(7):
            day_date = monday_of_week + timedelta(days=i)
            
            # ✅ CRÍTICO: NO filtrar por is_active - contar TODAS las encuestas creadas ese día
            # Incluir HOY en la consulta (<=)
            if day_date <= today:
                count = Survey.objects.filter(
                    creator=user,
                    created_at__date=day_date
                ).count()
                
                print(f"DEBUG: {day_date} - Encuestas creadas: {count}", file=sys.stderr)
            else:
                count = None  # Día futuro = null
                print(f"DEBUG: {day_date} - Día futuro, count=None", file=sys.stderr)
            
            daily_survey_counts.append({
                'date': day_date.strftime('%Y-%m-%d'),
                'day_name': day_names[i],
                'day_number': day_date.day,
                'count': count,
                'is_future': day_date > today
            })
        
        print(f"DEBUG: Usuario {user.username} - Activas: {active_surveys}, Eliminadas: {deleted_surveys}, Total: {total_surveys}", file=sys.stderr)
        print(f"DEBUG: Conteo diario histórico: {daily_survey_counts}", file=sys.stderr)
        
        return Response({
            'success': True,
            'stats': {
                'total_surveys': total_surveys,
                'active_surveys': active_surveys,
                'deleted_surveys': deleted_surveys,
            },
            'daily_survey_counts': daily_survey_counts,  # ✅ NUEVO: Conteo histórico por día
        })
        
    except Exception as e:
        print(f"ERROR en api_user_survey_stats: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return Response({
            'error': f'Error obteniendo estadísticas de encuestas: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        print(f"DEBUG: Usuario {user.username} - Activas: {active_surveys}, Eliminadas: {deleted_surveys}, Total: {total_surveys}", file=sys.stderr)
        
        return Response({
            'success': True,
            'stats': {
                'total_surveys': total_surveys,
                'active_surveys': active_surveys,
                'deleted_surveys': deleted_surveys,
            }
        })
        
    except Exception as e:
        print(f"ERROR en api_user_survey_stats: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return Response({
            'error': f'Error obteniendo estadísticas de encuestas: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([])  # Permitir acceso anónimo
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_historic_ranking(request):
    """
    ✅ NUEVO: Ranking Histórico de TODAS las encuestas (sin filtro de fecha)
    
    Obtiene el Top 5 de encuestas de toda la historia ordenadas por:
    - Suma de (likes_count + response_count)
    - Solo encuestas activas
    - Solo de usuarios verificados
    
    Returns:
        Response: {
            'success': True,
            'ranking': [
                {
                    'id': int,
                    'title': str,
                    'creator': {...},
                    'likes_count': int,
                    'response_count': int,
                    'total_score': int,  # likes + respuestas
                    ...
                }
            ]
        }
    """
    try:
        # ✅ CRÍTICO: Obtener TODAS las encuestas activas (sin filtro de fecha ni verificación)
        surveys = Survey.objects.filter(
            is_active=True
        ).select_related('creator', 'creator__profile').prefetch_related('comments')
        
        # ✅ UNIFICADO: Calcular score con fórmula consistente
        # Fórmula: (Likes * 2) + (Respuestas * 1) + (Comentarios * 1) - (Dislikes * 1)
        ranked_surveys = []
        for survey in surveys:
            likes = survey.likes_count
            dislikes = survey.dislikes_count
            response_count = survey.comments.count()
            
            # Fórmula unificada
            total_score = (likes * 2) + response_count - dislikes
            
            ranked_surveys.append({
                'survey': survey,
                'total_score': total_score,
                'likes_count': likes,
                'dislikes_count': dislikes,
                'response_count': response_count,
            })
        
        # Ordenar por total_score descendente
        ranked_surveys.sort(key=lambda x: x['total_score'], reverse=True)
        
        # Tomar solo Top 5
        top_5 = ranked_surveys[:5]
        
        # Serializar
        result = []
        for item in top_5:
            survey = item['survey']
            serialized = _serialize_survey(survey, request.user)
            serialized['total_score'] = item['total_score']
            result.append(serialized)
        
        return Response({
            'success': True,
            'surveys': result,  # ✅ FIX: Cambiar 'ranking' a 'surveys' para consistencia con frontend
            'total_surveys_evaluated': len(ranked_surveys),
        })
        
    except Exception as e:
        print(f"ERROR en api_historic_ranking: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return Response({
            'error': f'Error obteniendo ranking histórico: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ✅ DESARROLLO: Endpoint para activar VIP (solo para testing)
# ✅ DESARROLLO: Endpoint para activar VIP (solo para testing)
@csrf_exempt  # ✅ Permitir peticiones sin CSRF token
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_activate_vip(request):
    """
    Activa el estado VIP de un usuario (solo para desarrollo/testing)
    
    POST /api/users/activate-vip/
    Body: {
        "user_id": 1,
        "plan_type": "monthly"  # monthly, quarterly, annual
    }
    """
    try:
        user_id = request.data.get('user_id')
        plan_type = request.data.get('plan_type', 'monthly')
        
        if not user_id:
            return Response({
                'success': False,
                'error': 'user_id es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener el usuario
        user = get_object_or_404(User, id=user_id)
        profile = user.profile
        
        # Activar VIP
        profile.is_vip = True
        profile.save()
        
        # Calcular días según el plan
        if plan_type == 'monthly':
            days = 30
        elif plan_type == 'quarterly':
            days = 90
        elif plan_type == 'annual':
            days = 365
        else:
            days = 30
        
        # Crear o actualizar suscripción
        from surveys.models import Subscription
        subscription, created = Subscription.objects.get_or_create(
            user=user,
            defaults={
                'plan_type': plan_type,
                'status': 'active',
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=days),
                'price': 9.99 if plan_type == 'monthly' else (24.99 if plan_type == 'quarterly' else 89.99),
            }
        )
        
        if not created:
            # Actualizar suscripción existente
            subscription.status = 'active'
            subscription.plan_type = plan_type
            subscription.end_date = timezone.now() + timedelta(days=days)
            subscription.save()
        
        return Response({
            'success': True,
            'message': f'VIP activado exitosamente para {user.username}',
            'end_date': subscription.end_date.isoformat(),
            'days': days,
            'is_vip': profile.is_vip
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
