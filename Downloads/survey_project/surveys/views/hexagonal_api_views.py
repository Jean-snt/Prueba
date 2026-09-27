"""
Hexagonal Architecture API Views - New endpoints using clean architecture
"""
import asyncio
from functools import wraps

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.response import Response
from rest_framework import status

from infrastructure.container import container


def async_view(view_func):
    """Decorator to handle async views in Django"""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        return asyncio.run(view_func(request, *args, **kwargs))
    return wrapper


# Survey endpoints using hexagonal architecture
@api_view(['GET'])
@permission_classes([])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_surveys(request):
    """Get surveys using hexagonal architecture"""
    controller = container.get_survey_controller()
    return await controller.get_surveys(request)


@api_view(['GET'])
@permission_classes([])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_survey_detail(request, pk: int):
    """Get survey detail using hexagonal architecture"""
    controller = container.get_survey_controller()
    return await controller.get_survey_detail(request, pk)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_create_survey(request):
    """Create survey using hexagonal architecture"""
    controller = container.get_survey_controller()
    return await controller.create_survey(request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_user_surveys(request):
    """Get user surveys using hexagonal architecture"""
    controller = container.get_survey_controller()
    return await controller.get_user_surveys(request)


@api_view(['GET'])
@permission_classes([])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_popular_surveys(request):
    """Get popular surveys using hexagonal architecture"""
    controller = container.get_survey_controller()
    return await controller.get_popular_surveys(request)


# User endpoints using hexagonal architecture
@api_view(['POST'])
@permission_classes([])
@async_view
async def hexagonal_api_register_user(request):
    """Register user using hexagonal architecture"""
    controller = container.get_user_controller()
    return await controller.register_user(request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_user_profile(request):
    """Get user profile using hexagonal architecture"""
    controller = container.get_user_controller()
    return await controller.get_user_profile(request)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_update_profile(request):
    """Update user profile using hexagonal architecture"""
    controller = container.get_user_controller()
    return await controller.update_user_profile(request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_verify_user(request):
    """Verify user using hexagonal architecture"""
    controller = container.get_user_controller()
    return await controller.verify_user(request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_promote_vip(request):
    """Promote user to VIP using hexagonal architecture"""
    controller = container.get_user_controller()
    return await controller.promote_to_vip(request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_check_permissions(request):
    """Check user permissions using hexagonal architecture"""
    controller = container.get_user_controller()
    return await controller.check_permissions(request)


# Response endpoints using hexagonal architecture
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
@async_view
async def hexagonal_api_submit_response(request, pk: int):
    """Submit response to survey using hexagonal architecture"""
    try:
        from application.use_cases.response_use_cases import SubmitResponseUseCase, NotificationService
        from domain.value_objects.survey_id import SurveyId
        from domain.value_objects.user_id import UserId
        from django.db import transaction
        from surveys.models.response import Response as SurveyResponse, Answer
        from surveys.models.survey import Survey, Question, Choice
        from surveys.models.notification import Notification
        import json
        
        # Get repositories
        survey_repository = container.get_survey_repository()
        user_repository = container.get_user_repository()
        
        # Create use case
        submit_use_case = SubmitResponseUseCase(survey_repository, user_repository)
        notification_service = NotificationService(user_repository)
        
        # Parse request data
        if request.content_type == 'application/json':
            response_data = json.loads(request.body)
        else:
            response_data = dict(request.POST)
        
        # Execute use case
        survey_id = SurveyId.from_int(pk)
        user_id = UserId.from_int(request.user.id)
        
        result = await submit_use_case.execute(survey_id, user_id, response_data)
        
        # Persist response using Django ORM (Infrastructure layer)
        with transaction.atomic():
            # Get Django survey
            survey = Survey.objects.get(id=result['survey_id'], is_active=True)
            
            # Create response
            django_response = SurveyResponse.objects.create(
                survey=survey,
                user=request.user,
                general_comment=result['general_comment']
            )
            
            # Create answers
            for question_id, answer_value in result['answers'].items():
                try:
                    question = Question.objects.get(id=int(question_id), survey=survey)
                    
                    if question.type in ['radio', 'select', 'scale']:
                        if answer_value:
                            choice = Choice.objects.get(pk=int(answer_value), question=question)
                            Answer.objects.create(
                                response=django_response,
                                question=question,
                                choice=choice
                            )
                    elif question.type == 'checkbox':
                        if isinstance(answer_value, str):
                            answer_value = [answer_value]
                        for choice_id in answer_value:
                            choice = Choice.objects.get(pk=int(choice_id), question=question)
                            Answer.objects.create(
                                response=django_response,
                                question=question,
                                choice=choice
                            )
                    else:  # text, textarea
                        if answer_value and str(answer_value).strip():
                            Answer.objects.create(
                                response=django_response,
                                question=question,
                                text_answer=str(answer_value).strip()
                            )
                            
                except (Question.DoesNotExist, Choice.DoesNotExist, ValueError):
                    continue
            
            # Send notification to survey creator
            if result['survey_creator_id'] != request.user.id:
                try:
                    creator = survey.creator
                    message = f"Nueva respuesta de {request.user.username} en tu encuesta '{survey.title}'"
                    Notification.objects.create(
                        user=creator,
                        message=message
                    )
                    print(f"✅ Notificación enviada a {creator.username}")
                except Exception as e:
                    print(f"⚠️ Error enviando notificación: {e}")
        
        return Response({
            'success': True,
            'message': 'Respuesta enviada exitosamente',
            'response_id': django_response.id,
            'survey_id': survey.id,
            'notification_sent': True
        }, status=status.HTTP_201_CREATED)
        
    except PermissionError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_403_FORBIDDEN)
        
    except ValueError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        print(f"❌ Error en submit response: {e}")
        return Response({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([])  # Allow anonymous responses
@authentication_classes([TokenAuthentication, SessionAuthentication])
@csrf_exempt
@async_view
async def hexagonal_api_submit_response_anonymous(request, pk: int):
    """Submit anonymous response to survey using hexagonal architecture"""
    try:
        from application.use_cases.response_use_cases import SubmitResponseUseCase
        from domain.value_objects.survey_id import SurveyId
        from django.db import transaction
        from surveys.models.response import Response as SurveyResponse, Answer
        from surveys.models.survey import Survey, Question, Choice
        from surveys.models.notification import Notification
        import json
        
        # Get repositories
        survey_repository = container.get_survey_repository()
        user_repository = container.get_user_repository()
        
        # Create use case
        submit_use_case = SubmitResponseUseCase(survey_repository, user_repository)
        
        # Parse request data
        if request.content_type == 'application/json':
            response_data = json.loads(request.body)
        else:
            response_data = dict(request.POST)
        
        # Execute use case (anonymous)
        survey_id = SurveyId.from_int(pk)
        result = await submit_use_case.execute(survey_id, None, response_data)
        
        # Persist response using Django ORM (Infrastructure layer)
        with transaction.atomic():
            # Get Django survey
            survey = Survey.objects.get(id=result['survey_id'], is_active=True)
            
            # Create anonymous response
            django_response = SurveyResponse.objects.create(
                survey=survey,
                user=None,  # Anonymous
                general_comment=result['general_comment']
            )
            
            # Create answers
            for question_id, answer_value in result['answers'].items():
                try:
                    question = Question.objects.get(id=int(question_id), survey=survey)
                    
                    if question.type in ['radio', 'select', 'scale']:
                        if answer_value:
                            choice = Choice.objects.get(pk=int(answer_value), question=question)
                            Answer.objects.create(
                                response=django_response,
                                question=question,
                                choice=choice
                            )
                    elif question.type == 'checkbox':
                        if isinstance(answer_value, str):
                            answer_value = [answer_value]
                        for choice_id in answer_value:
                            choice = Choice.objects.get(pk=int(choice_id), question=question)
                            Answer.objects.create(
                                response=django_response,
                                question=question,
                                choice=choice
                            )
                    else:  # text, textarea
                        if answer_value and str(answer_value).strip():
                            Answer.objects.create(
                                response=django_response,
                                question=question,
                                text_answer=str(answer_value).strip()
                            )
                            
                except (Question.DoesNotExist, Choice.DoesNotExist, ValueError):
                    continue
            
            # Send notification to survey creator
            try:
                creator = survey.creator
                message = f"Nueva respuesta anónima en tu encuesta '{survey.title}'"
                Notification.objects.create(
                    user=creator,
                    message=message
                )
                print(f"✅ Notificación enviada a {creator.username}")
            except Exception as e:
                print(f"⚠️ Error enviando notificación: {e}")
        
        return Response({
            'success': True,
            'message': 'Respuesta anónima enviada exitosamente',
            'response_id': django_response.id,
            'survey_id': survey.id,
            'notification_sent': True
        }, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        print(f"❌ Error en submit response anónimo: {e}")
        return Response({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)