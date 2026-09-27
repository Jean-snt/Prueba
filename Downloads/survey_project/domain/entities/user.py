"""
User Domain Entity - Core business logic for users
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum

from domain.value_objects.user_id import UserId
from domain.value_objects.gender import Gender
from domain.value_objects.email import Email


class UserType(Enum):
    REGULAR = "regular"
    VIP = "vip"
    ADMIN = "admin"


@dataclass
class User:
    """
    User Entity - Represents a user in the domain
    Contains all business rules and invariants
    """
    id: UserId
    username: str
    email: Email
    user_type: UserType
    gender: Gender
    age: Optional[int] = None
    country: Optional[str] = None
    full_name: Optional[str] = None
    is_verified: bool = False
    created_at: Optional[datetime] = None
    
    def __post_init__(self):
        """Validate business rules after initialization"""
        self._validate_username()
        self._validate_age()
    
    def _validate_username(self):
        """Business rule: Username validation"""
        if not self.username or len(self.username.strip()) == 0:
            raise ValueError("Username is required")
        
        if len(self.username) < 3:
            raise ValueError("Username must be at least 3 characters")
        
        if len(self.username) > 150:
            raise ValueError("Username cannot exceed 150 characters")
    
    def _validate_age(self):
        """Business rule: Age validation"""
        if self.age is not None:
            if self.age < 18:
                raise ValueError("User must be at least 18 years old")
            if self.age > 120:
                raise ValueError("Invalid age")
    
    def is_vip(self) -> bool:
        """Check if user is VIP"""
        return self.user_type == UserType.VIP
    
    def is_admin(self) -> bool:
        """Check if user is admin"""
        return self.user_type == UserType.ADMIN
    
    def can_create_surveys(self) -> bool:
        """Business rule: Can user create surveys?"""
        return self.is_verified
    
    def can_use_advanced_filters(self) -> bool:
        """Business rule: Can user use advanced filters?"""
        return self.is_vip() or self.is_admin()
    
    def can_upload_images(self) -> bool:
        """Business rule: Can user upload images?"""
        return self.is_vip() or self.is_admin()
    
    def can_access_analytics(self) -> bool:
        """Business rule: Can user access analytics?"""
        return self.is_vip() or self.is_admin()
    
    def get_display_name(self) -> str:
        """Get user's display name"""
        if self.full_name and self.full_name.strip():
            return self.full_name
        return self.username
    
    def promote_to_vip(self):
        """Business rule: Promote user to VIP"""
        if self.user_type == UserType.REGULAR:
            self.user_type = UserType.VIP
    
    def demote_from_vip(self):
        """Business rule: Demote user from VIP"""
        if self.user_type == UserType.VIP:
            self.user_type = UserType.REGULAR
    
    def verify_account(self):
        """Business rule: Verify user account"""
        self.is_verified = True
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization"""
        return {
            'id': str(self.id),
            'username': self.username,
            'email': str(self.email),
            'user_type': self.user_type.value,
            'gender': self.gender.value,
            'age': self.age,
            'country': self.country,
            'full_name': self.full_name,
            'display_name': self.get_display_name(),
            'is_verified': self.is_verified,
            'is_vip': self.is_vip(),
            'is_admin': self.is_admin(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }