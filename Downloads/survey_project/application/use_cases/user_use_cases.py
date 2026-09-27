"""
User Use Cases - Application layer orchestration for user operations
"""
from typing import Optional, Dict, Any

from ..dto.user_dto import (
    CreateUserRequest,
    UpdateUserRequest,
    UserResponse,
    UserProfileResponse,
    AuthenticationRequest,
    AuthenticationResponse
)
from ..interfaces.user_repository_interface import UserRepositoryInterface
from domain.services.user_service import UserService
from domain.value_objects.user_id import UserId
from domain.value_objects.email import Email
from domain.exceptions import (
    UserNotFound,
    UserRegistrationError,
    ValidationError
)


class UserUseCases:
    """Use cases for user operations"""
    
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        user_service: UserService
    ):
        self.user_repository = user_repository
        self.user_service = user_service
    
    async def create_user(self, request: CreateUserRequest) -> UserResponse:
        """Create a new user"""
        try:
            # Check if user already exists
            email_obj = Email.from_string(request.email)
            if await self.user_repository.exists_by_email(email_obj):
                raise UserRegistrationError("Email already registered")
            
            if await self.user_repository.exists_by_username(request.username):
                raise UserRegistrationError("Username already taken")
            
            # Create user using domain service
            user = self.user_service.create_user(
                username=request.username,
                email=request.email,
                gender=request.gender,
                age=request.age,
                country=request.country,
                full_name=request.full_name
            )
            
            # Save user
            saved_user = await self.user_repository.save(user)
            
            # Return response DTO
            return self._map_user_to_response(saved_user)
            
        except Exception as e:
            if isinstance(e, (UserRegistrationError, ValidationError)):
                raise
            raise UserRegistrationError(f"Failed to create user: {str(e)}")
    
    async def get_user_by_id(self, user_id: int) -> UserResponse:
        """Get user by ID"""
        user_id_vo = UserId.from_int(user_id)
        user = await self.user_repository.find_by_id(user_id_vo)
        
        if not user:
            raise UserNotFound(f"User with ID {user_id} not found")
        
        return self._map_user_to_response(user)
    
    async def get_user_profile(self, user_id: int) -> UserProfileResponse:
        """Get user profile with statistics"""
        user_id_vo = UserId.from_int(user_id)
        user = await self.user_repository.find_by_id(user_id_vo)
        
        if not user:
            raise UserNotFound(f"User with ID {user_id} not found")
        
        # Get user statistics
        statistics = self.user_service.get_user_statistics(user)
        
        return UserProfileResponse(
            user=self._map_user_to_response(user),
            statistics=statistics
        )
    
    async def update_user_profile(self, request: UpdateUserRequest) -> UserResponse:
        """Update user profile"""
        user_id_vo = UserId.from_int(request.user_id)
        user = await self.user_repository.find_by_id(user_id_vo)
        
        if not user:
            raise UserNotFound(f"User with ID {request.user_id} not found")
        
        # Update user using domain service
        updates = {}
        if request.gender is not None:
            updates['gender'] = request.gender
        if request.age is not None:
            updates['age'] = request.age
        if request.country is not None:
            updates['country'] = request.country
        if request.full_name is not None:
            updates['full_name'] = request.full_name
        
        updated_user = self.user_service.update_user_profile(user, updates)
        
        # Save updated user
        saved_user = await self.user_repository.update(updated_user)
        
        return self._map_user_to_response(saved_user)
    
    async def verify_user(self, user_id: int) -> UserResponse:
        """Verify user account"""
        user_id_vo = UserId.from_int(user_id)
        user = await self.user_repository.find_by_id(user_id_vo)
        
        if not user:
            raise UserNotFound(f"User with ID {user_id} not found")
        
        # Verify user using domain service
        verified_user = self.user_service.verify_user(user)
        
        # Save updated user
        saved_user = await self.user_repository.update(verified_user)
        
        return self._map_user_to_response(saved_user)
    
    async def promote_to_vip(self, user_id: int) -> UserResponse:
        """Promote user to VIP"""
        user_id_vo = UserId.from_int(user_id)
        user = await self.user_repository.find_by_id(user_id_vo)
        
        if not user:
            raise UserNotFound(f"User with ID {user_id} not found")
        
        # Promote user using domain service
        vip_user = self.user_service.promote_to_vip(user)
        
        # Save updated user
        saved_user = await self.user_repository.update(vip_user)
        
        return self._map_user_to_response(saved_user)
    
    async def authenticate_user(self, request: AuthenticationRequest) -> Optional[AuthenticationResponse]:
        """Authenticate user (placeholder - would integrate with auth system)"""
        # This would integrate with your authentication system
        # For now, just find user by username
        user = await self.user_repository.find_by_username(request.username)
        
        if not user:
            return None
        
        # TODO: Verify password hash
        # For now, just return user data
        return AuthenticationResponse(
            user=self._map_user_to_response(user),
            token="dummy_token",  # Would be generated by auth system
            expires_at="2024-12-31T23:59:59Z"  # Would be calculated
        )
    
    async def check_user_permissions(self, user_id: int, feature: str) -> bool:
        """Check if user has permission for specific feature"""
        user_id_vo = UserId.from_int(user_id)
        user = await self.user_repository.find_by_id(user_id_vo)
        
        if not user:
            return False
        
        return self.user_service.can_user_access_feature(user, feature)
    
    def _map_user_to_response(self, user) -> UserResponse:
        """Map domain user to response DTO"""
        return UserResponse(
            id=int(user.id),
            username=user.username,
            email=str(user.email),
            display_name=user.get_display_name(),
            user_type=user.user_type.value,
            gender=user.gender.value,
            age=user.age,
            country=user.country,
            full_name=user.full_name,
            is_verified=user.is_verified,
            is_vip=user.is_vip(),
            is_admin=user.is_admin(),
            created_at=user.created_at.isoformat() if user.created_at else None,
            permissions={
                'can_create_surveys': user.can_create_surveys(),
                'can_use_advanced_filters': user.can_use_advanced_filters(),
                'can_upload_images': user.can_upload_images(),
                'can_access_analytics': user.can_access_analytics(),
            }
        )