"""
Django User Controller - Web adapter for user operations
"""
import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.response import Response
from rest_framework import status

from application.use_cases.user_use_cases import UserUseCases
from application.dto.user_dto import (
    CreateUserRequest,
    UpdateUserRequest,
    AuthenticationRequest
)
from domain.exceptions import (
    UserNotFound,
    UserRegistrationError,
    ValidationError
)


class DjangoUserController:
    """Django web controller for user operations"""
    
    def __init__(self, user_use_cases: UserUseCases):
        self.user_use_cases = user_use_cases
    
    @api_view(['POST'])
    @permission_classes([])
    async def register_user(self, request):
        """Register new user"""
        try:
            data = request.data
            
            create_request = CreateUserRequest(
                username=data.get('username', ''),
                email=data.get('email', ''),
                password=data.get('password', ''),
                gender=data.get('gender', 'A'),
                age=data.get('age'),
                country=data.get('country'),
                full_name=data.get('full_name')
            )
            
            result = await self.user_use_cases.create_user(create_request)
            
            return Response({
                'success': True,
                'message': 'User registered successfully',
                'user': self._serialize_user_response(result)
            }, status=status.HTTP_201_CREATED)
            
        except (UserRegistrationError, ValidationError) as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error registering user: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['GET'])
    @permission_classes([IsAuthenticated])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def get_user_profile(self, request):
        """Get current user profile"""
        try:
            result = await self.user_use_cases.get_user_profile(request.user.id)
            
            return Response({
                'success': True,
                'user': self._serialize_user_response(result.user),
                'statistics': result.statistics
            })
            
        except UserNotFound:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error getting user profile: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['PUT'])
    @permission_classes([IsAuthenticated])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def update_user_profile(self, request):
        """Update current user profile"""
        try:
            data = request.data
            
            update_request = UpdateUserRequest(
                user_id=request.user.id,
                gender=data.get('gender'),
                age=data.get('age'),
                country=data.get('country'),
                full_name=data.get('full_name')
            )
            
            result = await self.user_use_cases.update_user_profile(update_request)
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'user': self._serialize_user_response(result)
            })
            
        except UserNotFound:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error updating profile: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['POST'])
    @permission_classes([IsAuthenticated])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def verify_user(self, request):
        """Verify current user account"""
        try:
            result = await self.user_use_cases.verify_user(request.user.id)
            
            return Response({
                'success': True,
                'message': 'User verified successfully',
                'user': self._serialize_user_response(result)
            })
            
        except UserNotFound:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error verifying user: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['POST'])
    @permission_classes([IsAuthenticated])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def promote_to_vip(self, request):
        """Promote current user to VIP (admin only)"""
        try:
            # Check if current user is admin
            if not request.user.is_staff:
                return Response({
                    'success': False,
                    'error': 'Admin privileges required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user_id = request.data.get('user_id')
            if not user_id:
                user_id = request.user.id
            
            result = await self.user_use_cases.promote_to_vip(user_id)
            
            return Response({
                'success': True,
                'message': 'User promoted to VIP successfully',
                'user': self._serialize_user_response(result)
            })
            
        except UserNotFound:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error promoting user: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @api_view(['GET'])
    @permission_classes([IsAuthenticated])
    @authentication_classes([TokenAuthentication, SessionAuthentication])
    async def check_permissions(self, request):
        """Check user permissions for specific feature"""
        try:
            feature = request.GET.get('feature')
            if not feature:
                return Response({
                    'success': False,
                    'error': 'Feature parameter required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            has_permission = await self.user_use_cases.check_user_permissions(
                request.user.id, feature
            )
            
            return Response({
                'success': True,
                'feature': feature,
                'has_permission': has_permission
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error checking permissions: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _serialize_user_response(self, user_response) -> dict:
        """Serialize user response DTO to dict"""
        return {
            'id': user_response.id,
            'username': user_response.username,
            'email': user_response.email,
            'display_name': user_response.display_name,
            'user_type': user_response.user_type,
            'gender': user_response.gender,
            'age': user_response.age,
            'country': user_response.country,
            'full_name': user_response.full_name,
            'is_verified': user_response.is_verified,
            'is_vip': user_response.is_vip,
            'is_admin': user_response.is_admin,
            'created_at': user_response.created_at,
            'permissions': user_response.permissions
        }