"""
User Repository Interface - Defines contract for user data access
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from domain.entities.user import User
from domain.value_objects.user_id import UserId
from domain.value_objects.email import Email


class UserRepository(ABC):
    """Abstract repository for user data access"""
    
    @abstractmethod
    async def save(self, user: User) -> User:
        """Save a user entity"""
        pass
    
    @abstractmethod
    async def find_by_id(self, user_id: UserId) -> Optional[User]:
        """Find user by ID"""
        pass
    
    @abstractmethod
    async def find_by_email(self, email: Email) -> Optional[User]:
        """Find user by email"""
        pass
    
    @abstractmethod
    async def find_by_username(self, username: str) -> Optional[User]:
        """Find user by username"""
        pass
    
    @abstractmethod
    async def find_all_verified(self) -> List[User]:
        """Find all verified users"""
        pass
    
    @abstractmethod
    async def find_all_vip(self) -> List[User]:
        """Find all VIP users"""
        pass
    
    @abstractmethod
    async def update(self, user: User) -> User:
        """Update existing user"""
        pass
    
    @abstractmethod
    async def delete(self, user_id: UserId) -> bool:
        """Delete user by ID"""
        pass
    
    @abstractmethod
    async def exists_by_email(self, email: Email) -> bool:
        """Check if user exists by email"""
        pass
    
    @abstractmethod
    async def exists_by_username(self, username: str) -> bool:
        """Check if user exists by username"""
        pass