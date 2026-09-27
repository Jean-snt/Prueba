"""
Response Use Cases - Application Layer
"""
from typing import Dict, Any, Optional
from datetime import datetime

from domain.entities.survey import Survey
from domain.value_objects.survey_id import SurveyId
from domain.value_objects.user_id import UserId
from application.interfaces.survey_repository_interface import SurveyRepositoryInterface
from application.interfaces.user_repository_interface import UserRepositoryInterface


class SubmitResponseUseCase:
    """Use case for submitting a response to a survey"""
    
    def __init__(
        self,
        survey_repository: SurveyRepositoryInterface,
        user_repository: UserRepositoryInterface
    ):
        self.survey_repository = survey_repository
        self.user_repository = user_repository
    
    async def execute(
        self,
        survey_id: SurveyId,
        user_id: Optional[UserId],
        response_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Submit a response to a survey
        
        Args:
            survey_id: ID of the survey to respond to
            user_id: ID of the user submitting (optional for anonymous)
            response_data: Dictionary containing the response data
            
        Returns:
            Dictionary with response result
            
        Raises:
            ValueError: If survey not found or not active
            PermissionError: If user cannot respond to this survey
        """
        # Get survey
        survey = await self.survey_repository.find_by_id(survey_id)
        if not survey:
            raise ValueError(f"Survey with ID {survey_id} not found")
        
        if not survey.is_active():
            raise ValueError("Survey is not active")
        
        # Validate user permissions (business rules)
        if user_id:
            user = await self.user_repository.find_by_id(user_id)
            if not user:
                raise ValueError(f"User with ID {user_id} not found")
            
            # Business rule: User cannot respond to their own survey
            if survey.creator_id == user_id:
                raise PermissionError("Cannot respond to your own survey")
            
            # Business rule: User must be verified to respond
            if not user.is_verified:
                raise PermissionError("User must be verified to respond to surveys")
        
        # Validate response data
        if not response_data:
            raise ValueError("Response data cannot be empty")
        
        # Extract response information
        answers = {}
        general_comment = response_data.get('general_comment', '').strip()
        
        # Process question answers
        for key, value in response_data.items():
            if key.startswith('question_') and value:
                question_id = key.replace('question_', '')
                answers[question_id] = value
        
        if not answers and not general_comment:
            raise ValueError("Response must contain at least one answer or comment")
        
        # Return response data for persistence layer
        return {
            'survey_id': int(survey_id),
            'user_id': int(user_id) if user_id else None,
            'answers': answers,
            'general_comment': general_comment,
            'submitted_at': datetime.now(),
            'survey_creator_id': int(survey.creator_id)
        }


class NotificationService:
    """Service for handling notifications"""
    
    def __init__(self, user_repository: UserRepositoryInterface):
        self.user_repository = user_repository
    
    async def notify_survey_response(
        self,
        survey_creator_id: UserId,
        respondent_id: Optional[UserId],
        survey_title: str
    ) -> bool:
        """
        Send notification to survey creator about new response
        
        Args:
            survey_creator_id: ID of the survey creator
            respondent_id: ID of the respondent (optional for anonymous)
            survey_title: Title of the survey
            
        Returns:
            True if notification was sent successfully
        """
        try:
            creator = await self.user_repository.find_by_id(survey_creator_id)
            if not creator:
                return False
            
            # Determine respondent name
            respondent_name = "Usuario anónimo"
            if respondent_id:
                respondent = await self.user_repository.find_by_id(respondent_id)
                if respondent:
                    respondent_name = respondent.username
            
            # Create notification message
            message = f"Nueva respuesta de {respondent_name} en tu encuesta '{survey_title}'"
            
            # This will be implemented by the infrastructure layer
            # For now, return True to indicate the service is working
            return True
            
        except Exception as e:
            print(f"Error sending notification: {e}")
            return False