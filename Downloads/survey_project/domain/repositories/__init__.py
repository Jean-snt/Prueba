"""
Domain Repositories - Abstract interfaces for data access
"""
from .survey_repository import SurveyRepository
from .user_repository import UserRepository

__all__ = [
    'SurveyRepository',
    'UserRepository'
]