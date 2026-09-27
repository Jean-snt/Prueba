"""
Django Survey Controller - Web adapter for survey operations
"""
import json
from typing import Optional

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.response import Response
from rest_framework import status

from application.use_cases.survey_use_cases import SurveyUseCases
from application.dto.survey_dto import (
    CreateSurveyRequest,
    SurveyFilters,
    UpdateSurveyRequest
)
from domain.exceptions import (
    SurveyNotFound,
    SurveyCreationError,
    UserNotFound,
    InsufficientPermissions
)


class DjangoSurveyController:
    """Django web controller for survey operations"""
    
    def __init__(self, survey_use_cases: SurveyUseCases):
        self.survey_use_cases = survey_use_cases
    
    @api_view(['GET'])
    @permission_classes([])  # Allow anonymous access
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def get_surveys(self, request):
        """Get surveys with filters"""
        try:
            # Parse filters from request
            filters = SurveyFilters(
                country=request.GET.get('country'),
                age_min=self._parse_int(request.GET.get('age_min')),
                age_max=self._parse_int(request.GET.get('age_max')),
                gender=request.GET.get('gender'),
                show_nsfw=request.GET.get('show_nsfw', 'false').lower() == 'true',
                search_term=request.GET.get('search'),
                limit=self._parse_int(request.GET.get('limit', 50))
            )
            
            # Get current user ID if authenticated
            current_user_id = request.user.id if request.user.is_authenticated else None
            
            # Execute use case
            result = await self.survey_use_cases.get_surveys_with_filters(
                filters, current_user_id
            )
            
            return Response({
                'surveys': [self._serialize_survey_response(s) for s in result.surveys],
                'total_count': result.total_count,
                'filters_applied': result.filters_applied
            })
            
        except Exception as e:
            return Response({
                'error': f'Error getting surveys: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['GET'])
    @permission_classes([])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def get_survey_detail(self, request, pk: int):
        """Get survey detail by ID"""
        try:
            result = await self.survey_use_cases.get_survey_by_id(pk)
            
            return Response({
                'survey': self._serialize_survey_response(result.survey),
                'questions': result.questions,
                'statistics': result.statistics
            })
            
        except SurveyNotFound:
            return Response({
                'error': 'Survey not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Error getting survey: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['POST'])
    @permission_classes([IsAuthenticated])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def create_survey(self, request):
        """Create new survey"""
        try:
            # Parse request data
            if request.content_type and 'multipart/form-data' in request.content_type:
                # Handle multipart form data
                title = request.data.get('title', '').strip()
                description = request.data.get('description', '').strip()
                is_nsfw = request.data.get('is_nsfw', 'false').lower() == 'true'
                creator_identity_str = request.data.get('creator_identity', '{}')
                
                # Parse creator identity
                try:
                    creator_identity = json.loads(creator_identity_str) if isinstance(creator_identity_str, str) else creator_identity_str
                except:
                    creator_identity = {}
                
                # Handle image upload
                image_url = None
                if 'image' in request.FILES:
                    # TODO: Handle image upload and get URL
                    pass
            else:
                # Handle JSON data
                data = request.data
                title = data.get('title', '').strip()
                description = data.get('description', '').strip()
                is_nsfw = data.get('is_nsfw', False)
                creator_identity = data.get('creator_identity', {})
                image_url = None
            
            # Create request DTO
            create_request = CreateSurveyRequest(
                title=title,
                description=description,
                creator_id=request.user.id,
                is_nsfw=is_nsfw,
                image_url=image_url,
                creator_identity=creator_identity
            )
            
            # Execute use case
            result = await self.survey_use_cases.create_survey(create_request)
            
            return Response({
                'success': True,
                'message': 'Survey created successfully',
                'survey': self._serialize_survey_response(result)
            }, status=status.HTTP_201_CREATED)
            
        except UserNotFound:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except InsufficientPermissions as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_403_FORBIDDEN)
        except SurveyCreationError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error creating survey: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['GET'])
    @permission_classes([IsAuthenticated])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def get_user_surveys(self, request):
        """Get surveys created by current user"""
        try:
            limit = self._parse_int(request.GET.get('limit', 10))
            
            result = await self.survey_use_cases.get_user_surveys(
                request.user.id, limit
            )
            
            return Response({
                'success': True,
                'surveys': [self._serialize_survey_response(s) for s in result],
                'total': len(result)
            })
            
        except UserNotFound:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error getting user surveys: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['GET'])
    @permission_classes([])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def get_popular_surveys(self, request):
        """Get popular surveys"""
        try:
            limit = self._parse_int(request.GET.get('limit', 5))
            
            result = await self.survey_use_cases.get_popular_surveys(limit)
            
            return Response({
                'surveys': [self._serialize_survey_response(s) for s in result]
            })
            
        except Exception as e:
            return Response({
                'error': f'Error getting popular surveys: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _parse_int(self, value: Optional[str]) -> Optional[int]:
        """Parse string to int, return None if invalid"""
        if not value:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _serialize_survey_response(self, survey_response) -> dict:
        """Serialize survey response DTO to dict"""
        return {
            'id': survey_response.id,
            'title': survey_response.title,
            'description': survey_response.description,
            'creator': survey_response.creator,
            'is_active': survey_response.is_active,
            'is_nsfw': survey_response.is_nsfw,
            'created_at': survey_response.created_at,
            'response_count': survey_response.response_count,
            'image_url': survey_response.image_url,
            'creator_gender': survey_response.creator_gender  # ← CRÍTICO: Campo directo del DTO
        }