"""
Domain Value Objects - Immutable objects that represent domain concepts
"""
from .gender import Gender
from .survey_id import SurveyId
from .user_id import UserId
from .email import Email

__all__ = [
    'Gender',
    'SurveyId', 
    'UserId',
    'Email'
]