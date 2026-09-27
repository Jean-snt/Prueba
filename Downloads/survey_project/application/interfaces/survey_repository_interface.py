"""
Survey Repository Interface - Application layer interface for survey data access
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from domain.entities.survey import Survey
from domain.value_objects.survey_id import SurveyId
from domain.value_objects.user_id import UserId


class SurveyRepositoryInterface(ABC):
    """Interface for survey repository in application layer"""
    
    @abstractmethod
    async def save(self, survey: Survey) -> Survey:
        """Save a survey entity"""
        pass
    
    @abstractmethod
    async def find_by_id(self, survey_id: SurveyId) -> Optional[Survey]:
        """Find survey by ID"""
        pass
    
    @abstractmethod
    async def find_all_active(self, limit: int = 50) -> List[Survey]:
        """Find all active surveys"""
        pass
    
    @abstractmethod
    async def find_by_creator(self, creator_id: UserId, limit: int = 10) -> List[Survey]:
        """Find surveys by creator"""
        pass
    
    @abstractmethod
    async def find_with_filters(self, filters: Dict[str, Any]) -> List[Survey]:
        """Find surveys with advanced filters"""
        pass
    
    @abstractmethod
    async def update(self, survey: Survey) -> Survey:
        """Update existing survey"""
        pass
    
    @abstractmethod
    async def delete(self, survey_id: SurveyId) -> bool:
        """Delete survey by ID"""
        pass
    
    @abstractmethod
    async def count_by_creator(self, creator_id: UserId) -> int:
        """Count surveys by creator"""
        pass
    
    @abstractmethod
    async def find_popular(self, limit: int = 5) -> List[Survey]:
        """Find most popular surveys by response count"""
        pass
    
    @abstractmethod
    async def search_by_text(self, search_term: str, limit: int = 50) -> List[Survey]:
        """Search surveys by text in title or description"""
        pass