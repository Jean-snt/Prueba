"""
Django User Repository - Infrastructure implementation for user data access
"""
from typing import List, Optional
from datetime import datetime

from django.contrib.auth.models import User as DjangoUser
from asgiref.sync import sync_to_async

from application.interfaces.user_repository_interface import UserRepositoryInterface
from domain.entities.user import User, UserType
from domain.value_objects.user_id import UserId
from domain.value_objects.email import Email
from domain.value_objects.gender import Gender
from surveys.models.user_profile import UserProfile


class DjangoUserRepository(UserRepositoryInterface):
    """Django implementation of user repository"""
    
    async def save(self, user: User) -> User:
        """Save a user entity"""
        django_user = await self._create_django_user(user)
        
        # Update the domain entity with the generated ID
        user.id = UserId.from_int(django_user.id)
        return user
    
    async def find_by_id(self, user_id: UserId) -> Optional[User]:
        """Find user by ID"""
        try:
            django_user = await sync_to_async(DjangoUser.objects.select_related('profile').get)(
                id=int(user_id)
            )
            return self._map_to_domain(django_user)
        except DjangoUser.DoesNotExist:
            return None
    
    async def find_by_email(self, email: Email) -> Optional[User]:
        """Find user by email"""
        try:
            django_user = await sync_to_async(DjangoUser.objects.select_related('profile').get)(
                email=str(email)
            )
            return self._map_to_domain(django_user)
        except DjangoUser.DoesNotExist:
            return None
    
    async def find_by_username(self, username: str) -> Optional[User]:
        """Find user by username"""
        try:
            django_user = await sync_to_async(DjangoUser.objects.select_related('profile').get)(
                username=username
            )
            return self._map_to_domain(django_user)
        except DjangoUser.DoesNotExist:
            return None
    
    async def find_all_verified(self) -> List[User]:
        """Find all verified users"""
        django_users = await sync_to_async(list)(
            DjangoUser.objects.filter(
                is_active=True,
                profile__is_verified=True
            ).select_related('profile')
        )
        
        return [self._map_to_domain(du) for du in django_users]
    
    async def find_all_vip(self) -> List[User]:
        """Find all VIP users"""
        django_users = await sync_to_async(list)(
            DjangoUser.objects.filter(
                is_active=True,
                profile__is_vip=True
            ).select_related('profile')
        )
        
        return [self._map_to_domain(du) for du in django_users]
    
    async def update(self, user: User) -> User:
        """Update existing user"""
        try:
            django_user = await sync_to_async(DjangoUser.objects.select_related('profile').get)(
                id=int(user.id)
            )
            
            # Update Django user fields
            django_user.username = user.username
            django_user.email = str(user.email)
            django_user.is_staff = user.is_admin()
            
            if user.full_name:
                names = user.full_name.split(' ', 1)
                django_user.first_name = names[0]
                django_user.last_name = names[1] if len(names) > 1 else ''
            
            await sync_to_async(django_user.save)()
            
            # Update profile
            profile = django_user.profile
            profile.gender = user.gender.value
            profile.age = user.age
            profile.country = user.country
            profile.is_verified = user.is_verified
            profile.is_vip = user.is_vip()
            
            await sync_to_async(profile.save)()
            
            return user
            
        except DjangoUser.DoesNotExist:
            raise ValueError(f"User with ID {user.id} not found")
    
    async def delete(self, user_id: UserId) -> bool:
        """Delete user by ID"""
        try:
            django_user = await sync_to_async(DjangoUser.objects.get)(
                id=int(user_id)
            )
            await sync_to_async(django_user.delete)()
            return True
        except DjangoUser.DoesNotExist:
            return False
    
    async def exists_by_email(self, email: Email) -> bool:
        """Check if user exists by email"""
        return await sync_to_async(DjangoUser.objects.filter(
            email=str(email)
        ).exists)()
    
    async def exists_by_username(self, username: str) -> bool:
        """Check if user exists by username"""
        return await sync_to_async(DjangoUser.objects.filter(
            username=username
        ).exists)()
    
    async def _create_django_user(self, user: User) -> DjangoUser:
        """Create Django user from domain entity"""
        # Create Django user
        django_user = DjangoUser(
            username=user.username,
            email=str(user.email),
            is_staff=user.is_admin(),
            is_active=True
        )
        
        if user.full_name:
            names = user.full_name.split(' ', 1)
            django_user.first_name = names[0]
            django_user.last_name = names[1] if len(names) > 1 else ''
        
        await sync_to_async(django_user.save)()
        
        # Create or update profile
        profile, created = await sync_to_async(UserProfile.objects.get_or_create)(
            user=django_user,
            defaults={
                'gender': user.gender.value,
                'age': user.age,
                'country': user.country,
                'is_verified': user.is_verified,
                'is_vip': user.is_vip(),
            }
        )
        
        if not created:
            profile.gender = user.gender.value
            profile.age = user.age
            profile.country = user.country
            profile.is_verified = user.is_verified
            profile.is_vip = user.is_vip()
            await sync_to_async(profile.save)()
        
        return django_user
    
    def _map_to_domain(self, django_user: DjangoUser) -> User:
        """Map Django model to domain entity"""
        # Get profile
        profile = getattr(django_user, 'profile', None)
        
        # Determine user type
        user_type = UserType.REGULAR
        if django_user.is_staff:
            user_type = UserType.ADMIN
        elif profile and getattr(profile, 'is_vip', False):
            user_type = UserType.VIP
        
        # Get full name
        full_name = None
        if django_user.first_name or django_user.last_name:
            full_name = f"{django_user.first_name} {django_user.last_name}".strip()
        
        return User(
            id=UserId.from_int(django_user.id),
            username=django_user.username,
            email=Email.from_string(django_user.email),
            user_type=user_type,
            gender=Gender.from_string(profile.gender if profile else 'A'),
            age=profile.age if profile else None,
            country=profile.country if profile else None,
            full_name=full_name,
            is_verified=profile.is_verified if profile else False,
            created_at=django_user.date_joined
        )