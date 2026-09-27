"""
User Data Transfer Objects - For application layer communication
"""
from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class CreateUserRequest:
    """DTO for user creation request"""
    username: str
    email: str
    password: str
    gender: str = 'A'
    age: Optional[int] = None
    country: Optional[str] = None
    full_name: Optional[str] = None


@dataclass
class UpdateUserRequest:
    """DTO for user update request"""
    user_id: int
    gender: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    full_name: Optional[str] = None


@dataclass
class UserResponse:
    """DTO for user response"""
    id: int
    username: str
    email: str
    display_name: str
    user_type: str
    gender: str
    age: Optional[int]
    country: Optional[str]
    full_name: Optional[str]
    is_verified: bool
    is_vip: bool
    is_admin: bool
    created_at: Optional[str]
    permissions: Dict[str, bool]


@dataclass
class UserProfileResponse:
    """DTO for user profile response"""
    user: UserResponse
    statistics: Dict[str, Any]


@dataclass
class AuthenticationRequest:
    """DTO for authentication request"""
    username: str
    password: str


@dataclass
class AuthenticationResponse:
    """DTO for authentication response"""
    user: UserResponse
    token: str
    expires_at: str