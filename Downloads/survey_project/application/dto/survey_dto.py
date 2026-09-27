"""
Survey Data Transfer Objects - For application layer communication
"""
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from datetime import datetime


@dataclass
class CreateSurveyRequest:
    """DTO for survey creation request"""
    title: str
    description: str
    creator_id: int
    is_nsfw: bool = False
    image_url: Optional[str] = None
    creator_identity: Optional[Dict[str, Any]] = None


@dataclass
class UpdateSurveyRequest:
    """DTO for survey update request"""
    survey_id: int
    title: Optional[str] = None
    description: Optional[str] = None
    is_nsfw: Optional[bool] = None
    is_active: Optional[bool] = None


@dataclass
class SurveyFilters:
    """DTO for survey filtering"""
    country: Optional[str] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    gender: Optional[str] = None
    show_nsfw: bool = False
    search_term: Optional[str] = None
    limit: int = 50


@dataclass
class SurveyResponse:
    """DTO for survey response"""
    id: int
    title: str
    description: str
    creator: Optional[Dict[str, Any]]
    is_active: bool
    is_nsfw: bool
    created_at: str
    response_count: int
    image_url: Optional[str]
    color: str
    creator_gender: str  # ← CRÍTICO: Campo directo para el frontend


@dataclass
class SurveyListResponse:
    """DTO for survey list response"""
    surveys: List[SurveyResponse]
    total_count: int
    filters_applied: Dict[str, Any]


@dataclass
class SurveyDetailResponse:
    """DTO for detailed survey response"""
    survey: SurveyResponse
    questions: List[Dict[str, Any]]
    statistics: Dict[str, Any]