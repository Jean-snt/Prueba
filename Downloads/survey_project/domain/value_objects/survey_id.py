"""
Survey ID Value Object - Represents survey identifier in the domain
"""
from dataclasses import dataclass
from typing import Union


@dataclass(frozen=True)
class SurveyId:
    """Survey ID value object - ensures type safety and validation"""
    value: int
    
    def __post_init__(self):
        """Validate survey ID"""
        if not isinstance(self.value, int):
            raise ValueError("Survey ID must be an integer")
        
        if self.value <= 0:
            raise ValueError("Survey ID must be positive")
    
    def __str__(self) -> str:
        return str(self.value)
    
    def __int__(self) -> int:
        return self.value
    
    @classmethod
    def from_int(cls, value: int) -> 'SurveyId':
        """Create SurveyId from integer"""
        return cls(value)
    
    @classmethod
    def from_string(cls, value: Union[str, int]) -> 'SurveyId':
        """Create SurveyId from string or int"""
        if isinstance(value, str):
            try:
                return cls(int(value))
            except ValueError:
                raise ValueError(f"Cannot convert '{value}' to SurveyId")
        elif isinstance(value, int):
            return cls(value)
        else:
            raise ValueError(f"Cannot convert {type(value)} to SurveyId")