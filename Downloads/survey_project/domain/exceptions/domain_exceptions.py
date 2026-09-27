"""
Domain Exceptions - Business rule violations and domain errors
"""


class DomainException(Exception):
    """Base exception for domain errors"""
    pass


class ValidationError(DomainException):
    """Raised when domain validation fails"""
    pass


class BusinessRuleViolation(DomainException):
    """Raised when business rules are violated"""
    pass


class EntityNotFound(DomainException):
    """Raised when an entity is not found"""
    pass


class UnauthorizedOperation(DomainException):
    """Raised when user is not authorized for operation"""
    pass


# Survey specific exceptions
class SurveyCreationError(ValidationError):
    """Raised when survey creation fails validation"""
    pass


class SurveyNotActive(BusinessRuleViolation):
    """Raised when trying to interact with inactive survey"""
    pass


class SurveyNotFound(EntityNotFound):
    """Raised when survey is not found"""
    pass


# User specific exceptions
class UserRegistrationError(ValidationError):
    """Raised when user registration fails validation"""
    pass


class UserNotVerified(BusinessRuleViolation):
    """Raised when unverified user tries restricted operation"""
    pass


class UserNotFound(EntityNotFound):
    """Raised when user is not found"""
    pass


class InsufficientPermissions(UnauthorizedOperation):
    """Raised when user lacks required permissions"""
    pass
