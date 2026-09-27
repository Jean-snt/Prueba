"""
User ID Value Object - Represents user identifier in the domain
"""
from dataclasses import dataclass
from typing import Union


@dataclass(frozen=True)
class UserId:
    """User ID value object - ensures type safety and validation"""
    value: int
    
    def __post_init__(self):
        """Validate user ID"""
        if not isinstance(self.value, int):
            raise ValueError("User ID must be an integer")
        
        if self.value <= 0:
            raise ValueError("User ID must be positive")
    
    def __str__(self) -> str:
        return str(self.value)
    
    def __int__(self) -> int:
        return self.value
    
    def __eq__(self, other) -> bool:
        if isinstance(other, UserId):
            return self.value == other.value
        return False
    
    def __hash__(self) -> int:
        return hash(self.value)
    
    @classmethod
    def from_int(cls, value: int) -> 'UserId':
        """Create UserId from integer"""
        return cls(value)
    
    @classmethod
    def from_string(cls, value: Union[str, int]) -> 'UserId':
        """Create UserId from string or int"""
        if isinstance(value, str):
            try:
                return cls(int(value))
            except ValueError:
                raise ValueError(f"Cannot convert '{value}' to UserId")
        elif isinstance(value, int):
            return cls(value)
        else:
            raise ValueError(f"Cannot convert {type(value)} to UserId")