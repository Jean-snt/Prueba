"""
Django Survey Repository - Infrastructure implementation for survey data access
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from django.db.models import Q, Count
from asgiref.sync import sync_to_async

from application.interfaces.survey_repository_interface import SurveyRepositoryInterface
from domain.entities.survey import Survey, SurveyStatus
from domain.value_objects.survey_id import SurveyId
from domain.value_objects.user_id import UserId
from domain.value_objects.gender import Gender
from surveys.models.survey import Survey as DjangoSurvey


class DjangoSurveyRepository(SurveyRepositoryInterface):
    """Django implementation of survey repository"""
    
    async def save(self, survey: Survey) -> Survey:
        """Save a survey entity"""
        django_survey = await self._create_django_survey(survey)
        
        # Update the domain entity with the generated ID
        survey.id = SurveyId.from_int(django_survey.id)
        return survey
    
    async def find_by_id(self, survey_id: SurveyId) -> Optional[Survey]:
        """Find survey by ID"""
        try:
            django_survey = await sync_to_async(DjangoSurvey.objects.select_related('creator').get)(
                id=int(survey_id)
            )
            return self._map_to_domain(django_survey)
        except DjangoSurvey.DoesNotExist:
            return None
    
    async def find_all_active(self, limit: int = 50) -> List[Survey]:
        """Find all active surveys"""
        django_surveys = await sync_to_async(list)(
            DjangoSurvey.objects.filter(
                is_active=True,
                creator__profile__is_verified=True
            ).select_related('creator', 'creator__profile')
            .order_by('-created_at')[:limit]
        )
        
        return [self._map_to_domain(ds) for ds in django_surveys]
    
    async def find_by_creator(self, creator_id: UserId, limit: int = 10) -> List[Survey]:
        """Find surveys by creator"""
        django_surveys = await sync_to_async(list)(
            DjangoSurvey.objects.filter(
                creator_id=int(creator_id)
            ).select_related('creator', 'creator__profile')
            .order_by('-created_at')[:limit]
        )
        
        return [self._map_to_domain(ds) for ds in django_surveys]
    
    async def find_with_filters(self, filters: Dict[str, Any]) -> List[Survey]:
        """Find surveys with advanced filters"""
        queryset = DjangoSurvey.objects.filter(
            is_active=True,
            creator__profile__is_verified=True
        ).select_related('creator', 'creator__profile')
        
        # Apply filters
        if filters.get('country'):
            queryset = queryset.filter(creator__profile__country=filters['country'])
        
        if filters.get('age_min'):
            queryset = queryset.filter(creator__profile__age__gte=filters['age_min'])
        
        if filters.get('age_max'):
            queryset = queryset.filter(creator__profile__age__lte=filters['age_max'])
        
        if filters.get('gender'):
            queryset = queryset.filter(creator_gender=filters['gender'])
        
        if not filters.get('show_nsfw', False):
            queryset = queryset.exclude(is_nsfw=True)
        
        # Order and limit
        django_surveys = await sync_to_async(list)(
            queryset.order_by('-created_at')[:50]
        )
        
        return [self._map_to_domain(ds) for ds in django_surveys]
    
    async def update(self, survey: Survey) -> Survey:
        """Update existing survey"""
        try:
            django_survey = await sync_to_async(DjangoSurvey.objects.get)(
                id=int(survey.id)
            )
            
            # Update fields
            django_survey.title = survey.title
            django_survey.description = survey.description
            django_survey.is_active = survey.is_active()
            django_survey.is_nsfw = survey.is_nsfw
            django_survey.creator_gender = survey.creator_gender.value
            
            await sync_to_async(django_survey.save)()
            
            return survey
            
        except DjangoSurvey.DoesNotExist:
            raise ValueError(f"Survey with ID {survey.id} not found")
    
    async def delete(self, survey_id: SurveyId) -> bool:
        """Delete survey by ID"""
        try:
            django_survey = await sync_to_async(DjangoSurvey.objects.get)(
                id=int(survey_id)
            )
            await sync_to_async(django_survey.delete)()
            return True
        except DjangoSurvey.DoesNotExist:
            return False
    
    async def count_by_creator(self, creator_id: UserId) -> int:
        """Count surveys by creator"""
        return await sync_to_async(DjangoSurvey.objects.filter(
            creator_id=int(creator_id)
        ).count)()
    
    async def find_popular(self, limit: int = 5) -> List[Survey]:
        """Find most popular surveys by response count"""
        django_surveys = await sync_to_async(list)(
            DjangoSurvey.objects.filter(
                is_active=True,
                creator__profile__is_verified=True
            ).select_related('creator', 'creator__profile')
            .annotate(response_count=Count('response'))
            .order_by('-response_count', '-created_at')[:limit]
        )
        
        return [self._map_to_domain(ds) for ds in django_surveys]
    
    async def search_by_text(self, search_term: str, limit: int = 50) -> List[Survey]:
        """Search surveys by text in title or description"""
        django_surveys = await sync_to_async(list)(
            DjangoSurvey.objects.filter(
                Q(title__icontains=search_term) | Q(description__icontains=search_term),
                is_active=True,
                creator__profile__is_verified=True
            ).select_related('creator', 'creator__profile')
            .order_by('-created_at')[:limit]
        )
        
        return [self._map_to_domain(ds) for ds in django_surveys]
    
    async def _create_django_survey(self, survey: Survey) -> DjangoSurvey:
        """Create Django survey from domain entity"""
        django_survey = DjangoSurvey(
            title=survey.title,
            description=survey.description,
            creator_id=int(survey.creator_id),
            creator_gender=survey.creator_gender.value,
            is_active=survey.is_active(),
            is_nsfw=survey.is_nsfw,
        )
        
        if survey.image_url:
            # Handle image URL - would need to adapt based on your image handling
            pass
        
        await sync_to_async(django_survey.save)()
        return django_survey
    
    def _map_to_domain(self, django_survey: DjangoSurvey) -> Survey:
        """Map Django model to domain entity"""
        # Get response count
        response_count = getattr(django_survey, 'response_count', 0)
        if response_count == 0:
            response_count = django_survey.response_set.count()
        
        return Survey(
            id=SurveyId.from_int(django_survey.id),
            title=django_survey.title,
            description=django_survey.description,
            creator_id=UserId.from_int(django_survey.creator_id),
            creator_gender=Gender.from_string(django_survey.creator_gender),
            status=SurveyStatus.ACTIVE if django_survey.is_active else SurveyStatus.INACTIVE,
            is_nsfw=django_survey.is_nsfw,
            created_at=django_survey.created_at,
            image_url=django_survey.image.url if django_survey.image else None,
            response_count=response_count
        )