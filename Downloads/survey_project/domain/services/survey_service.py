"""
Survey Domain Service - Contains complex business logic for surveys
"""
from typing import List, Dict, Any, Optional
from datetime import datetime

from domain.entities.survey import Survey, SurveyStatus
from domain.entities.user import User
from domain.value_objects.survey_id import SurveyId
from domain.value_objects.user_id import UserId
from domain.value_objects.gender import Gender


class SurveyService:
    """Domain service for survey business logic"""
    
    def validate_survey_creation(self, user: User, title: str, description: str) -> Dict[str, Any]:
        """Validate survey creation business rules"""
        errors = []
        
        # User must be verified to create surveys
        if not user.can_create_surveys():
            errors.append("User must be verified to create surveys")
        
        # Title validation
        if not title or len(title.strip()) == 0:
            title = "Encuesta sin título"
        elif len(title) > 255:
            errors.append("Survey title cannot exceed 255 characters")
        
        # Description validation
        if not description or len(description.strip()) == 0:
            errors.append("Survey description is required")
        elif len(description) > 1000:
            errors.append("Survey description cannot exceed 1000 characters")
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'title': title.strip() if title else "Encuesta sin título"
        }
    
    def create_survey(
        self, 
        creator: User, 
        title: str, 
        description: str, 
        is_nsfw: bool = False,
        image_url: Optional[str] = None,
        creator_gender: Optional[Gender] = None  # ← NUEVO: género específico
    ) -> Survey:
        """Create a new survey with business rules"""
        
        # Validate creation
        validation = self.validate_survey_creation(creator, title, description)
        if not validation['is_valid']:
            raise ValueError(f"Survey creation failed: {', '.join(validation['errors'])}")
        
        # Usar género específico o el del usuario como fallback
        survey_gender = creator_gender if creator_gender else creator.gender
        
        # Create survey entity
        survey = Survey(
            id=SurveyId.from_int(0),  # Will be set by repository
            title=validation['title'],
            description=description.strip(),
            creator_id=creator.id,
            creator_gender=survey_gender,  # ← USAR género específico
            status=SurveyStatus.ACTIVE,
            is_nsfw=is_nsfw,
            created_at=datetime.now(),
            image_url=image_url
        )
        
        return survey
    
    def can_user_upload_image(self, user: User) -> bool:
        """Check if user can upload images to surveys"""
        return user.can_upload_images()
    
    def filter_surveys_for_user(self, surveys: List[Survey], user: Optional[User]) -> List[Survey]:
        """Filter surveys based on user permissions and preferences"""
        filtered = []
        
        for survey in surveys:
            # Skip inactive surveys
            if not survey.is_active():
                continue
            
            # Handle NSFW content
            if survey.is_nsfw:
                # Only show NSFW to authenticated users who explicitly want to see it
                if not user:
                    continue
                # For now, we'll let the UI handle NSFW filtering
                # In a real app, you might check user preferences here
            
            filtered.append(survey)
        
        return filtered
    
    def get_survey_statistics(self, survey: Survey) -> Dict[str, Any]:
        """Get statistics for a survey"""
        return {
            'id': str(survey.id),
            'title': survey.title,
            'creator_gender': survey.creator_gender.value,
            'is_nsfw': survey.is_nsfw,
            'is_active': survey.is_active(),
            'response_count': survey.response_count,
            'created_at': survey.created_at.isoformat(),
            'color': survey.get_color_for_gender(),
            'can_be_answered': survey.can_be_answered()
        }
    
    def apply_advanced_filters(
        self, 
        surveys: List[Survey], 
        filters: Dict[str, Any],
        user: Optional[User] = None
    ) -> List[Survey]:
        """Apply advanced filters to survey list"""
        filtered = surveys.copy()
        
        # Gender filter
        if filters.get('gender'):
            gender = Gender.from_string(filters['gender'])
            filtered = [s for s in filtered if s.creator_gender == gender]
        
        # NSFW filter
        show_nsfw = filters.get('show_nsfw', False)
        if not show_nsfw:
            filtered = [s for s in filtered if not s.is_nsfw]
        
        # Age and country filters would be handled by repository
        # since they require user profile data
        
        return filtered
    
    def search_surveys(self, surveys: List[Survey], search_term: str) -> List[Survey]:
        """Search surveys by text"""
        if not search_term or not search_term.strip():
            return surveys
        
        search_lower = search_term.lower().strip()
        
        return [
            survey for survey in surveys
            if (search_lower in survey.title.lower() or 
                search_lower in survey.description.lower())
        ]