# surveys/urls.py
from django.urls import path
from .views.survey_views import survey_list, survey_detail, create_survey, survey_results
from .views.response_views import submit_response, survey_thanks
from .views.auth_views import (
    register_view, 
    verify_account_view,
    api_register, 
    api_check_nickname,
    api_login, 
    api_verify_account,
    api_user_profile,  # ← NUEVO
    api_resend_verification_code,
    api_password_reset_request,
    api_password_reset_confirm,
    api_password_reset_status,
)
from .views.api_views import (
    api_surveys, 
    api_survey_detail, 
    api_survey_delete,  # ✅ NUEVO: Endpoint para eliminar encuesta
    api_submit_response,
    api_create_survey,  # ← NUEVO
    api_user_surveys,   # ← NUEVO
    api_notifications,
    api_mark_notification_read,
    api_mark_all_notifications_read,
    api_delete_notification,  # ✅ NUEVO: Eliminar notificación individual
    api_delete_all_notifications,  # ✅ NUEVO: Vaciar bandeja de notificaciones
    api_survey_comments,
    api_create_comment,
    api_update_comment,
    api_delete_comment,
    api_survey_like,  # ✅ NUEVO
    api_historic_ranking,  # ✅ NUEVO: Ranking histórico
    api_report_content,
    api_user_reports,
    api_verified_profiles,  # ← Nuevo endpoint
    api_delete_account,  # ✅ NUEVO: Eliminar cuenta de usuario
    api_vip_karma_reward,  # ✅ NUEVO: Karma VIP
    api_vip_karma_stats,  # ✅ NUEVO: Estadísticas VIP
    api_update_profile,  # ✅ NUEVO: Actualizar perfil
    api_update_nickname,  # ✅ NUEVO: Actualizar apodo
    api_user_view_stats,  # ✅ NUEVO: Estadísticas de visualizaciones
    api_user_survey_stats,  # ✅ NUEVO: Estadísticas de encuestas del usuario
    api_activate_vip,  # ✅ DESARROLLO: Activar VIP (testing)
    # APIs de suscripciones VIP
    api_subscription_plans,
    api_user_subscription,
    api_create_subscription,
    api_upload_payment_proof,
    api_paypal_verify_payment,
    api_yape_payment,
    api_cancel_subscription,
    # APIs de administración
    api_admin_pending_subscriptions,
    api_admin_approve_subscription,
    api_admin_reject_subscription,
    api_admin_stats,
)
# ✅ TEMPORADAS 2026: Ranking Trimestral
from .views.api_ranking_2026 import api_quarterly_ranking
# Hexagonal Architecture endpoints
from .views.hexagonal_api_views import (
    hexagonal_api_surveys,
    hexagonal_api_survey_detail,
    hexagonal_api_create_survey,
    hexagonal_api_user_surveys,
    hexagonal_api_popular_surveys,
    hexagonal_api_register_user,
    hexagonal_api_user_profile,
    hexagonal_api_update_profile,
    hexagonal_api_verify_user,
    hexagonal_api_promote_vip,
    hexagonal_api_check_permissions,
    hexagonal_api_submit_response,
    hexagonal_api_submit_response_anonymous,
)

app_name = 'surveys'

urlpatterns = [
    path('', survey_list, name='survey_list'),
    path('crear/', create_survey, name='create_survey'),
    path('<int:pk>/', survey_detail, name='survey_detail'),
    path('<int:pk>/resultados/', survey_results, name='survey_results'),
    path('<int:pk>/submit/', submit_response, name='submit_response'),
    path('thanks/', survey_thanks, name='survey_thanks'),
    
    # Autenticación
    path('register/', register_view, name='register'),
    path('verify-account/<str:username>/', verify_account_view, name='verify_account'),
    path('resend-code/<str:username>/', api_resend_verification_code, name='resend_verification_code'),
    
    # JSON API endpoints for frontend
    path('api/surveys/', api_surveys, name='api_surveys'),
    path('api/surveys/<int:pk>/', api_survey_detail, name='api_survey_detail'),
    path('api/surveys/<int:pk>/delete/', api_survey_delete, name='api_survey_delete'),  # ✅ NUEVO: Eliminar encuesta
    path('api/surveys/<int:pk>/submit/', api_submit_response, name='api_submit_response'),
    path('api/surveys/create/', api_create_survey, name='api_create_survey'),  # ← NUEVO
    path('api/surveys/user/', api_user_surveys, name='api_user_surveys'),  # ← NUEVO
    
    # Profiles API endpoints
    path('api/profiles/verified/', api_verified_profiles, name='api_verified_profiles'),
    
    # Notification API endpoints
    path('api/notifications/', api_notifications, name='api_notifications'),
    path('api/notifications/<int:notification_id>/read/', api_mark_notification_read, name='api_mark_notification_read'),
    path('api/notifications/mark-all-read/', api_mark_all_notifications_read, name='api_mark_all_notifications_read'),
    path('api/notifications/<int:notification_id>/delete/', api_delete_notification, name='api_delete_notification'),  # ✅ NUEVO
    path('api/notifications/delete-all/', api_delete_all_notifications, name='api_delete_all_notifications'),  # ✅ NUEVO
    
    # Auth API endpoints
    path('api/auth/register/', api_register, name='api_register'),
    path('api/auth/check-nickname/', api_check_nickname, name='api_check_nickname'),
    path('api/auth/login/', api_login, name='api_login'),
    path('api/auth/verify/', api_verify_account, name='api_verify_account'),
    path('api/auth/profile/', api_user_profile, name='api_user_profile'),  # ← NUEVO
    path('api/auth/profile/update/', api_update_profile, name='api_update_profile'),  # ✅ NUEVO: Actualizar perfil
    path('api/auth/view-stats/', api_user_view_stats, name='api_user_view_stats'),  # ✅ NUEVO: Estadísticas de visualizaciones
    path('api/auth/survey-stats/', api_user_survey_stats, name='api_user_survey_stats'),  # ✅ NUEVO: Estadísticas de encuestas
    path('api/auth/resend-code/', api_resend_verification_code, name='api_resend_verification_code'),
    path('api/auth/password-reset-request/', api_password_reset_request, name='api_password_reset_request'),
    path('api/auth/password-reset-confirm/', api_password_reset_confirm, name='api_password_reset_confirm'),
    path('api/auth/password-reset-status/', api_password_reset_status, name='api_password_reset_status'),
    path('api/auth/delete-account/', api_delete_account, name='api_delete_account'),  # ✅ NUEVO: Eliminar cuenta
    path('api/auth/vip-karma/', api_vip_karma_reward, name='api_vip_karma_reward'),  # ✅ NUEVO: Karma VIP
    path('api/auth/vip-karma-stats/', api_vip_karma_stats, name='api_vip_karma_stats'),  # ✅ NUEVO: Estadísticas VIP
    path('api/auth/update-nickname/', api_update_nickname, name='api_update_nickname'),  # ✅ NUEVO: Actualizar apodo
    
    # Comments API endpoints
    path('api/surveys/<int:pk>/comments/', api_survey_comments, name='api_survey_comments'),
    path('api/surveys/<int:pk>/comments/create/', api_create_comment, name='api_create_comment'),
    path('api/surveys/<int:pk>/comments/<int:comment_id>/update/', api_update_comment, name='api_update_comment'),
    path('api/surveys/<int:pk>/comments/<int:comment_id>/delete/', api_delete_comment, name='api_delete_comment'),
    
    # ✅ NUEVO: Likes API endpoint
    path('api/surveys/<int:pk>/like/', api_survey_like, name='api_survey_like'),
    
    # ✅ NUEVO: Historic Ranking API endpoint
    path('api/surveys/historic-ranking/', api_historic_ranking, name='api_historic_ranking'),
    
    # ✅ TEMPORADAS 2026: Quarterly Ranking API endpoint
    path('api/surveys/quarterly-ranking/', api_quarterly_ranking, name='api_quarterly_ranking'),
    
    # Reports API endpoints
    path('api/reports/create/', api_report_content, name='api_report_content'),
    path('api/reports/user/', api_user_reports, name='api_user_reports'),
    
    # Subscription API endpoints
    path('api/subscriptions/plans/', api_subscription_plans, name='api_subscription_plans'),
    path('api/subscriptions/user/', api_user_subscription, name='api_user_subscription'),
    path('api/subscriptions/create/', api_create_subscription, name='api_create_subscription'),
    path('api/subscriptions/upload-proof/', api_upload_payment_proof, name='api_upload_payment_proof'),
    path('api/payments/paypal-verify/', api_paypal_verify_payment, name='api_paypal_verify_payment'),
    path('api/payments/yape/', api_yape_payment, name='api_yape_payment'),
    path('api/subscriptions/cancel/', api_cancel_subscription, name='api_cancel_subscription'),
    
    # Admin API endpoints
    path('api/admin/stats/', api_admin_stats, name='api_admin_stats'),
    path('api/admin/pending-subscriptions/', api_admin_pending_subscriptions, name='api_admin_pending_subscriptions'),
    path('api/admin/approve-subscription/', api_admin_approve_subscription, name='api_admin_approve_subscription'),
    path('api/admin/reject-subscription/', api_admin_reject_subscription, name='api_admin_reject_subscription'),
    
    # ✅ COMENTADO: Endpoints hexagonales v2 no utilizados (evitar ruido en logs)
    # path('api/v2/surveys/', hexagonal_api_surveys, name='hexagonal_api_surveys'),
    # path('api/v2/surveys/<int:pk>/', hexagonal_api_survey_detail, name='hexagonal_api_survey_detail'),
    # path('api/v2/surveys/create/', hexagonal_api_create_survey, name='hexagonal_api_create_survey'),
    # path('api/v2/surveys/user/', hexagonal_api_user_surveys, name='hexagonal_api_user_surveys'),
    # path('api/v2/surveys/popular/', hexagonal_api_popular_surveys, name='hexagonal_api_popular_surveys'),
    # path('api/v2/surveys/<int:pk>/submit/', hexagonal_api_submit_response, name='hexagonal_api_submit_response'),
    # path('api/v2/surveys/<int:pk>/submit-anonymous/', hexagonal_api_submit_response_anonymous, name='hexagonal_api_submit_response_anonymous'),
    # path('api/v2/users/register/', hexagonal_api_register_user, name='hexagonal_api_register_user'),
    # path('api/v2/users/profile/', hexagonal_api_user_profile, name='hexagonal_api_user_profile'),
    # path('api/v2/users/profile/update/', hexagonal_api_update_profile, name='hexagonal_api_update_profile'),
    # path('api/v2/users/verify/', hexagonal_api_verify_user, name='hexagonal_api_verify_user'),
    # path('api/v2/users/promote-vip/', hexagonal_api_promote_vip, name='hexagonal_api_promote_vip'),
    # path('api/v2/users/permissions/', hexagonal_api_check_permissions, name='hexagonal_api_check_permissions'),
    
    # ✅ DESARROLLO: Endpoint para activar VIP (solo testing)
    path('api/users/activate-vip/', api_activate_vip, name='api_activate_vip'),
]
