"""
Dependency Injection Container - Wire up all dependencies for hexagonal architecture
"""
from application.use_cases.survey_use_cases import SurveyUseCases
from application.use_cases.user_use_cases import UserUseCases
from domain.services.survey_service import SurveyService
from domain.services.user_service import UserService
from infrastructure.persistence.django_survey_repository import DjangoSurveyRepository
from infrastructure.persistence.django_user_repository import DjangoUserRepository
from infrastructure.web.django_survey_controller import DjangoSurveyController
from infrastructure.web.django_user_controller import DjangoUserController


class Container:
    """Dependency injection container for hexagonal architecture"""
    
    def __init__(self):
        self._instances = {}
    
    def get_survey_repository(self):
        """Get survey repository instance"""
        if 'survey_repository' not in self._instances:
            self._instances['survey_repository'] = DjangoSurveyRepository()
        return self._instances['survey_repository']
    
    def get_user_repository(self):
        """Get user repository instance"""
        if 'user_repository' not in self._instances:
            self._instances['user_repository'] = DjangoUserRepository()
        return self._instances['user_repository']
    
    def get_survey_service(self):
        """Get survey domain service instance"""
        if 'survey_service' not in self._instances:
            self._instances['survey_service'] = SurveyService()
        return self._instances['survey_service']
    
    def get_user_service(self):
        """Get user domain service instance"""
        if 'user_service' not in self._instances:
            self._instances['user_service'] = UserService()
        return self._instances['user_service']
    
    def get_survey_use_cases(self):
        """Get survey use cases instance"""
        if 'survey_use_cases' not in self._instances:
            self._instances['survey_use_cases'] = SurveyUseCases(
                survey_repository=self.get_survey_repository(),
                user_repository=self.get_user_repository(),
                survey_service=self.get_survey_service(),
                user_service=self.get_user_service()
            )
        return self._instances['survey_use_cases']
    
    def get_user_use_cases(self):
        """Get user use cases instance"""
        if 'user_use_cases' not in self._instances:
            self._instances['user_use_cases'] = UserUseCases(
                user_repository=self.get_user_repository(),
                user_service=self.get_user_service()
            )
        return self._instances['user_use_cases']
    
    def get_survey_controller(self):
        """Get survey controller instance"""
        if 'survey_controller' not in self._instances:
            self._instances['survey_controller'] = DjangoSurveyController(
                survey_use_cases=self.get_survey_use_cases()
            )
        return self._instances['survey_controller']
    
    def get_user_controller(self):
        """Get user controller instance"""
        if 'user_controller' not in self._instances:
            self._instances['user_controller'] = DjangoUserController(
                user_use_cases=self.get_user_use_cases()
            )
        return self._instances['user_controller']


# Global container instance
container = Container()