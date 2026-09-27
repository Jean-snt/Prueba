"""
User Domain Service - Contains complex business logic for users
"""
from typing import Dict, Any, Optional
from datetime import datetime

from domain.entities.user import User, UserType
from domain.value_objects.user_id import UserId
from domain.value_objects.email import Email
from domain.value_objects.gender import Gender


class UserService:
    """Domain service for user business logic"""
    
    def validate_user_registration(
        self, 
        username: str, 
        email: str, 
        password: str
    ) -> Dict[str, Any]:
        """Validate user registration business rules"""
        errors = []
        
        # Username validation
        if not username or len(username.strip()) < 3:
            errors.append("Username must be at least 3 characters")
        elif len(username) > 150:
            errors.append("Username cannot exceed 150 characters")
        
        # Email validation
        try:
            email_obj = Email.from_string(email)
        except ValueError as e:
            errors.append(str(e))
        
        # Password validation
        if not password or len(password) < 6:
            errors.append("Password must be at least 6 characters")
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors
        }
    
    def create_user(
        self, 
        username: str, 
        email: str, 
        gender: str = 'A',
        age: Optional[int] = None,
        country: Optional[str] = None,
        full_name: Optional[str] = None
    ) -> User:
        """Create a new user with business rules"""
        
        # Validate basic data
        validation = self.validate_user_registration(username, email, "dummy_password")
        if not validation['is_valid']:
            raise ValueError(f"User creation failed: {', '.join(validation['errors'])}")
        
        # Create user entity
        user = User(
            id=UserId.from_int(0),  # Will be set by repository
            username=username.strip(),
            email=Email.from_string(email),
            user_type=UserType.REGULAR,
            gender=Gender.from_string(gender),
            age=age,
            country=country,
            full_name=full_name,
            is_verified=False,
            created_at=datetime.now()
        )
        
        return user
    
    def update_user_profile(
        self, 
        user: User, 
        updates: Dict[str, Any]
    ) -> User:
        """Update user profile with business rules"""
        
        # Age validation
        if 'age' in updates and updates['age'] is not None:
            age = updates['age']
            if age < 18:
                raise ValueError("User must be at least 18 years old")
            if age > 120:
                raise ValueError("Invalid age")
            user.age = age
        
        # Gender validation
        if 'gender' in updates:
            user.gender = Gender.from_string(updates['gender'])
        
        # Country validation
        if 'country' in updates:
            user.country = updates['country']
        
        # Full name validation
        if 'full_name' in updates:
            full_name = updates['full_name']
            if full_name and len(full_name.strip()) > 0:
                user.full_name = full_name.strip()
        
        return user
    
    def promote_to_vip(self, user: User) -> User:
        """Promote user to VIP with business rules"""
        if not user.is_verified:
            raise ValueError("User must be verified before becoming VIP")
        
        user.promote_to_vip()
        return user
    
    def verify_user(self, user: User) -> User:
        """Verify user account"""
        user.verify_account()
        return user
    
    def can_user_access_feature(self, user: User, feature: str) -> bool:
        """Check if user can access specific features"""
        feature_permissions = {
            'create_surveys': user.can_create_surveys(),
            'advanced_filters': user.can_use_advanced_filters(),
            'upload_images': user.can_upload_images(),
            'analytics': user.can_access_analytics(),
        }
        
        return feature_permissions.get(feature, False)
    
    def get_user_statistics(self, user: User) -> Dict[str, Any]:
        """Get user statistics and profile info"""
        return {
            'id': str(user.id),
            'username': user.username,
            'email': str(user.email),
            'display_name': user.get_display_name(),
            'user_type': user.user_type.value,
            'gender': user.gender.value,
            'age': user.age,
            'country': user.country,
            'is_verified': user.is_verified,
            'is_vip': user.is_vip(),
            'is_admin': user.is_admin(),
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'permissions': {
                'can_create_surveys': user.can_create_surveys(),
                'can_use_advanced_filters': user.can_use_advanced_filters(),
                'can_upload_images': user.can_upload_images(),
                'can_access_analytics': user.can_access_analytics(),
            }
        }