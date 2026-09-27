"""
Survey Domain Entity - Core business logic for surveys
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from enum import Enum

from domain.value_objects.gender import Gender
from domain.value_objects.survey_id import SurveyId
from domain.value_objects.user_id import UserId


class SurveyStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"


@dataclass
class Survey:
    """
    Survey Entity - Represents a survey in the domain
    Contains all business rules and invariants
    """
    id: SurveyId
    title: str
    description: str
    creator_id: UserId
    creator_gender: Gender
    status: SurveyStatus
    is_nsfw: bool
    created_at: datetime
    image_url: Optional[str] = None
    response_count: int = 0
    
    def __post_init__(self):
        """Validate business rules after initialization"""
        self._validate_title()
        self._validate_description()
    
    def _validate_title(self):
        """Business rule: Title validation"""
        if not self.title or len(self.title.strip()) == 0:
            self.title = "Encuesta sin título"
        
        if len(self.title) > 255:
            raise ValueError("Survey title cannot exceed 255 characters")
    
    def _validate_description(self):
        """Business rule: Description validation"""
        if not self.description or len(self.description.strip()) == 0:
            raise ValueError("Survey description is required")
        
        if len(self.description) > 1000:
            raise ValueError("Survey description cannot exceed 1000 characters")
    
    def activate(self):
        """Business rule: Activate survey"""
        if self.status == SurveyStatus.DRAFT:
            self.status = SurveyStatus.ACTIVE
    
    def deactivate(self):
        """Business rule: Deactivate survey"""
        self.status = SurveyStatus.INACTIVE
    
    def is_active(self) -> bool:
        """Check if survey is active"""
        return self.status == SurveyStatus.ACTIVE
    
    def can_be_answered(self) -> bool:
        """Business rule: Can survey be answered?"""
        return self.is_active()
    
    def increment_response_count(self):
        """Business rule: Increment response count"""
        self.response_count += 1
    
    def get_color_for_gender(self) -> str:
        """Business rule: Get color based on creator gender"""
        color_map = {
            Gender.MALE: '#E3F2FD',      # Blue
            Gender.FEMALE: '#FCE4EC',    # Pink
            Gender.ANONYMOUS: '#F5F5F5', # Gray
        }
        return color_map.get(self.creator_gender, '#F5F5F5')
    
    def is_created_by(self, user_id: UserId) -> bool:
        """Check if survey was created by specific user"""
        return self.creator_id == user_id
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization"""
        return {
            'id': str(self.id),
            'title': self.title,
            'description': self.description,
            'creator_id': str(self.creator_id),
            'creator_gender': self.creator_gender.value,
            'status': self.status.value,
            'is_nsfw': self.is_nsfw,
            'created_at': self.created_at.isoformat(),
            'image_url': self.image_url,
            'response_count': self.response_count,
            'color': self.get_color_for_gender()
        }