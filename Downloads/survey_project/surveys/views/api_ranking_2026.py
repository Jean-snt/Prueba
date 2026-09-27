# ✅ TEMPORADAS 2026: Lógica de Rankings Trimestrales
from datetime import datetime
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.response import Response
from rest_framework import status
import sys

from ..models.survey import Survey
from .api_views import _serialize_survey


def get_current_quarter_dates():
    """
    Calcula las fechas de inicio y fin del trimestre actual (2026)
    
    T1: Enero - Marzo (01/01 - 31/03)
    T2: Abril - Junio (01/04 - 30/06)
    T3: Julio - Septiembre (01/07 - 30/09)
    T4: Octubre - Diciembre (01/10 - 31/12)
    
    Returns:
        tuple: (quarter_start, quarter_end, quarter_name)
    """
    now = timezone.now()
    year = now.year
    month = now.month
    
    # Determinar trimestre actual
    if 1 <= month <= 3:
        quarter = 1
        start_month, end_month = 1, 3
        quarter_name = "T1 2026 (Ene-Mar)"
    elif 4 <= month <= 6:
        quarter = 2
        start_month, end_month = 4, 6
        quarter_name = "T2 2026 (Abr-Jun)"
    elif 7 <= month <= 9:
        quarter = 3
        start_month, end_month = 7, 9
        quarter_name = "T3 2026 (Jul-Sep)"
    else:  # 10-12
        quarter = 4
        start_month, end_month = 10, 12
        quarter_name = "T4 2026 (Oct-Dic)"
    
    # Crear fechas de inicio y fin
    quarter_start = datetime(year, start_month, 1, 0, 0, 0, tzinfo=timezone.get_current_timezone())
    
    # Último día del mes final
    if end_month in [1, 3, 5, 7, 8, 10, 12]:
        last_day = 31
    elif end_month in [4, 6, 9, 11]:
        last_day = 30
    else:  # Febrero
        last_day = 29 if year % 4 == 0 else 28
    
    quarter_end = datetime(year, end_month, last_day, 23, 59, 59, tzinfo=timezone.get_current_timezone())
    
    return quarter_start, quarter_end, quarter_name


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def api_quarterly_ranking(request):
    """
    ✅ TEMPORADAS 2026: Top Actual (Trimestral)
    
    Obtiene el Top 10 de encuestas del trimestre actual ordenadas por:
    - Fórmula: (Likes * 2) + (Respuestas * 1) - (Dislikes * 1)
    - Solo encuestas activas
    - Solo del trimestre actual
    
    Si hay menos de 10 encuestas, rellena con espacios vacíos.
    
    Returns:
        Response: {
            'success': True,
            'surveys': [...],  # Top 10 (puede tener menos)
            'quarter_name': str,  # "T2 2026 (Abr-Jun)"
            'quarter_start': str,  # ISO format
            'quarter_end': str,  # ISO format
            'total_surveys_in_quarter': int
        }
    """
    try:
        # Obtener fechas del trimestre actual
        quarter_start, quarter_end, quarter_name = get_current_quarter_dates()
        
        print(f"📅 Calculando Top Actual para {quarter_name}", file=sys.stderr)
        print(f"   Rango: {quarter_start} - {quarter_end}", file=sys.stderr)
        
        # Filtrar encuestas del trimestre actual
        surveys = Survey.objects.filter(
            is_active=True,
            created_at__gte=quarter_start,
            created_at__lte=quarter_end
        ).select_related('creator', 'creator__profile').prefetch_related('comments')
        
        # Calcular score para cada encuesta
        ranked_surveys = []
        for survey in surveys:
            likes = survey.likes_count
            dislikes = survey.dislikes_count
            response_count = survey.comments.count()
            
            # Fórmula unificada
            total_score = (likes * 2) + response_count - dislikes
            
            ranked_surveys.append({
                'survey': survey,
                'total_score': total_score,
                'likes_count': likes,
                'dislikes_count': dislikes,
                'response_count': response_count,
            })
        
        # Ordenar por total_score descendente
        ranked_surveys.sort(key=lambda x: x['total_score'], reverse=True)
        
        # Tomar solo Top 10
        top_10 = ranked_surveys[:10]
        
        print(f"✅ Encontradas {len(ranked_surveys)} encuestas en {quarter_name}", file=sys.stderr)
        print(f"   Top 10: {len(top_10)} encuestas", file=sys.stderr)
        
        # Serializar
        result = []
        for item in top_10:
            survey = item['survey']
            serialized = _serialize_survey(survey, request.user)
            serialized['total_score'] = item['total_score']
            result.append(serialized)
        
        return Response({
            'success': True,
            'surveys': result,
            'quarter_name': quarter_name,
            'quarter_start': quarter_start.isoformat(),
            'quarter_end': quarter_end.isoformat(),
            'total_surveys_in_quarter': len(ranked_surveys),
        })
        
    except Exception as e:
        print(f"❌ ERROR en api_quarterly_ranking: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return Response({
            'error': f'Error obteniendo ranking trimestral: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
