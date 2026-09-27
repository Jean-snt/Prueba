"""
Application Interfaces - Contracts for external dependencies
"""
from .survey_repository_interface import SurveyRepositoryInterface
from .user_repository_interface import UserRepositoryInterface

__all__ = [
    'SurveyRepositoryInterface',
    'UserRepositoryInterface'
]