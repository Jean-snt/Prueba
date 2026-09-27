"""
Domain Exceptions - Business rule violations and domain errors
"""
from .domain_exceptions import (
    DomainException,
    ValidationError,
    BusinessRuleViolation,
    EntityNotFound,
    UnauthorizedOperation,
    SurveyCreationError,
    SurveyNotActive,
    SurveyNotFound,
    UserRegistrationError,
    UserNotVerified,
    UserNotFound,
    InsufficientPermissions
)

__all__ = [
    'DomainException',
    'ValidationError',
    'BusinessRuleViolation',
    'EntityNotFound',
    'UnauthorizedOperation',
    'SurveyCreationError',
    'SurveyNotActive',
    'SurveyNotFound',
    'UserRegistrationError',
    'UserNotVerified',
    'UserNotFound',
    'InsufficientPermissions'
]