"""
Survey Use Cases - Application layer orchestration for survey operations
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from ..dto.survey_dto import (
    CreateSurveyRequest,
    UpdateSurveyRequest,
    SurveyFilters,
    SurveyResponse,
    SurveyListResponse,
    SurveyDetailResponse
)
from ..dto.user_dto import UserResponse
from ..interfaces.survey_repository_interface import SurveyRepositoryInterface
from ..interfaces.user_repository_interface import UserRepositoryInterface
from domain.services.survey_service import SurveyService
from domain.services.user_service import UserService
from domain.value_objects.survey_id import SurveyId
from domain.value_objects.user_id import UserId
from domain.exceptions import (
    SurveyNotFound,
    UserNotFound,
    SurveyCreationError,
    InsufficientPermissions
)


class SurveyUseCases:
    """Use cases for survey operations"""
    
    def __init__(
        self,
        survey_repository: SurveyRepositoryInterface,
        user_repository: UserRepositoryInterface,
        survey_service: SurveyService,
        user_service: UserService
    ):
        self.survey_repository = survey_repository
        self.user_repository = user_repository
        self.survey_service = survey_service
        self.user_service = user_service
    
    async def create_survey(self, request: CreateSurveyRequest) -> SurveyResponse:
        """Create a new survey"""
        try:
            # Get creator user
            creator_id = UserId.from_int(request.creator_id)
            creator = await self.user_repository.find_by_id(creator_id)
            
            if not creator:
                raise UserNotFound(f"Creator with ID {request.creator_id} not found")
            
            # Check permissions
            if not creator.can_create_surveys():
                raise InsufficientPermissions("User must be verified to create surveys")
            
            # Obtener género del creator_identity si está disponible
            creator_gender = None
            if request.creator_identity and request.creator_identity.get('gender'):
                from domain.value_objects.gender import Gender
                creator_gender = Gender.from_string(request.creator_identity['gender'])
            
            # Create survey using domain service
            survey = self.survey_service.create_survey(
                creator=creator,
                title=request.title,
                description=request.description,
                is_nsfw=request.is_nsfw,
                image_url=request.image_url,
                creator_gender=creator_gender  # ← PASAR género específico
            )
            
            # Save survey
            saved_survey = await self.survey_repository.save(survey)
            
            # Update user profile if creator identity provided
            if request.creator_identity:
                updated_creator = self.user_service.update_user_profile(
                    creator, request.creator_identity
                )
                await self.user_repository.update(updated_creator)
            
            # Return response DTO
            return self._map_survey_to_response(saved_survey, creator)
            
        except Exception as e:
            if isinstance(e, (UserNotFound, InsufficientPermissions)):
                raise
            raise SurveyCreationError(f"Failed to create survey: {str(e)}")
    
    async def get_survey_by_id(self, survey_id: int) -> SurveyDetailResponse:
        """Get survey by ID with details"""
        survey_id_vo = SurveyId.from_int(survey_id)
        survey = await self.survey_repository.find_by_id(survey_id_vo)
        
        if not survey:
            raise SurveyNotFound(f"Survey with ID {survey_id} not found")
        
        # Get creator
        creator = await self.user_repository.find_by_id(survey.creator_id)
        
        # Get statistics
        statistics = self.survey_service.get_survey_statistics(survey)
        
        return SurveyDetailResponse(
            survey=self._map_survey_to_response(survey, creator),
            questions=[],  # TODO: Implement questions
            statistics=statistics
        )
    
    async def get_surveys_with_filters(
        self, 
        filters: SurveyFilters,
        current_user_id: Optional[int] = None
    ) -> SurveyListResponse:
        """Get surveys with filters applied"""
        
        # Get current user if provided
        current_user = None
        if current_user_id:
            user_id = UserId.from_int(current_user_id)
            current_user = await self.user_repository.find_by_id(user_id)
        
        # Build filter dict for repository
        repo_filters = {}
        if filters.country:
            repo_filters['country'] = filters.country
        if filters.age_min:
            repo_filters['age_min'] = filters.age_min
        if filters.age_max:
            repo_filters['age_max'] = filters.age_max
        if filters.gender:
            repo_filters['gender'] = filters.gender
        if filters.show_nsfw:
            repo_filters['show_nsfw'] = filters.show_nsfw
        
        # Get surveys from repository
        if repo_filters:
            surveys = await self.survey_repository.find_with_filters(repo_filters)
        else:
            surveys = await self.survey_repository.find_all_active(filters.limit)
        
        # Apply domain-level filtering
        filtered_surveys = self.survey_service.filter_surveys_for_user(surveys, current_user)
        
        # Apply search if provided
        if filters.search_term:
            filtered_surveys = self.survey_service.search_surveys(
                filtered_surveys, filters.search_term
            )
        
        # Apply advanced filters
        if current_user and current_user.can_use_advanced_filters():
            filter_dict = {
                'gender': filters.gender,
                'show_nsfw': filters.show_nsfw
            }
            filtered_surveys = self.survey_service.apply_advanced_filters(
                filtered_surveys, filter_dict, current_user
            )
        
        # Limit results
        filtered_surveys = filtered_surveys[:filters.limit]
        
        # Map to response DTOs
        survey_responses = []
        for survey in filtered_surveys:
            creator = await self.user_repository.find_by_id(survey.creator_id)
            survey_responses.append(self._map_survey_to_response(survey, creator))
        
        return SurveyListResponse(
            surveys=survey_responses,
            total_count=len(survey_responses),
            filters_applied={
                'country': filters.country,
                'age_range': f"{filters.age_min or ''}-{filters.age_max or ''}".strip('-'),
                'gender': filters.gender,
                'show_nsfw': filters.show_nsfw,
                'search_term': filters.search_term,
                'user_can_use_advanced_filters': current_user.can_use_advanced_filters() if current_user else False
            }
        )
    
    async def get_user_surveys(self, user_id: int, limit: int = 10) -> List[SurveyResponse]:
        """Get surveys created by user"""
        user_id_vo = UserId.from_int(user_id)
        user = await self.user_repository.find_by_id(user_id_vo)
        
        if not user:
            raise UserNotFound(f"User with ID {user_id} not found")
        
        surveys = await self.survey_repository.find_by_creator(user_id_vo, limit)
        
        return [
            self._map_survey_to_response(survey, user)
            for survey in surveys
        ]
    
    async def get_popular_surveys(self, limit: int = 5) -> List[SurveyResponse]:
        """Get most popular surveys"""
        surveys = await self.survey_repository.find_popular(limit)
        
        survey_responses = []
        for survey in surveys:
            creator = await self.user_repository.find_by_id(survey.creator_id)
            survey_responses.append(self._map_survey_to_response(survey, creator))
        
        return survey_responses
    
    async def update_survey(self, request: UpdateSurveyRequest) -> SurveyResponse:
        """Update existing survey"""
        survey_id = SurveyId.from_int(request.survey_id)
        survey = await self.survey_repository.find_by_id(survey_id)
        
        if not survey:
            raise SurveyNotFound(f"Survey with ID {request.survey_id} not found")
        
        # Update fields
        if request.title is not None:
            survey.title = request.title
        if request.description is not None:
            survey.description = request.description
        if request.is_nsfw is not None:
            survey.is_nsfw = request.is_nsfw
        if request.is_active is not None:
            if request.is_active:
                survey.activate()
            else:
                survey.deactivate()
        
        # Save updated survey
        updated_survey = await self.survey_repository.update(survey)
        
        # Get creator for response
        creator = await self.user_repository.find_by_id(survey.creator_id)
        
        return self._map_survey_to_response(updated_survey, creator)
    
    def _map_survey_to_response(self, survey, creator) -> SurveyResponse:
        """Map domain survey to response DTO"""
        creator_data = None
        if creator and creator.is_verified:
            creator_data = {
                'username': creator.username,
                'display_name': creator.get_display_name(),
                'full_name': creator.full_name,
                'gender': survey.creator_gender.value,  # Use stored gender
                'age': creator.age,
                'is_vip': creator.is_vip(),
                'country': {
                    'code': creator.country,
                    'name': creator.country  # TODO: Map to country name
                } if creator.country else None
            }
        
        return SurveyResponse(
            id=int(survey.id),
            title=survey.title,
            description=survey.description,
            creator=creator_data,
            is_active=survey.is_active(),
            is_nsfw=survey.is_nsfw,
            created_at=survey.created_at.isoformat(),
            response_count=survey.response_count,
            image_url=survey.image_url,
            color=survey.get_color_for_gender(),
            creator_gender=survey.creator_gender.value  # ← CRÍTICO: Campo directo
        )