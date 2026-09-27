"""
Email Value Object - Represents email address in the domain
"""
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Email:
    """Email value object - ensures email validation and type safety"""
    value: str
    
    def __post_init__(self):
        """Validate email format"""
        if not self.value:
            raise ValueError("Email cannot be empty")
        
        if not self._is_valid_email(self.value):
            raise ValueError(f"Invalid email format: {self.value}")
    
    def _is_valid_email(self, email: str) -> bool:
        """Validate email format using regex"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def __str__(self) -> str:
        return self.value
    
    def get_domain(self) -> str:
        """Get email domain"""
        return self.value.split('@')[1] if '@' in self.value else ''
    
    def get_username(self) -> str:
        """Get email username part"""
        return self.value.split('@')[0] if '@' in self.value else self.value
    
    @classmethod
    def from_string(cls, value: str) -> 'Email':
        """Create Email from string"""
        return cls(value.strip().lower())