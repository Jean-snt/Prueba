# surveys/views/survey_views.py (create_survey)
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.http import Http404
from django.forms import modelform_factory, inlineformset_factory
from ..models.survey import Survey, Question

@login_required
def create_survey(request):
    SurveyForm = modelform_factory(Survey, fields=['title', 'description', 'is_active'])
    QuestionFormSet = inlineformset_factory(Survey, Question, fields=['text', 'type'], extra=1, can_delete=True)

    if request.method == 'POST':
        form = SurveyForm(request.POST)
        formset = QuestionFormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            survey = form.save(commit=False)      # <- important
            survey.creator = request.user        # <- set creator
            survey.save()
            formset.instance = survey
            formset.save()
            return redirect('surveys:survey_detail', pk=survey.pk)
    else:
        form = SurveyForm()
        formset = QuestionFormSet()

    return render(request, 'surveys/create_survey.html', {'form': form, 'formset': formset})
# surveys/views/survey_views.py
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404, redirect
from django.forms import modelform_factory, inlineformset_factory

# importa tus modelos (ajusta si tus modelos están en otro archivo)
from ..models.survey import Survey, Question
from ..models.response import Response

def survey_list(request):
    from django.utils import timezone
    from django.db.models import Q
    
    # ✅ CRÍTICO: Filtrar encuestas activas Y no expiradas
    now = timezone.now()
    surveys = Survey.objects.filter(
        is_active=True
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    )
    return render(request, 'surveys/survey_list.html', {'surveys': surveys})

def survey_detail(request, pk):
    from django.utils import timezone
    from django.db.models import Q
    
    # ✅ CRÍTICO: Verificar que la encuesta no haya expirado
    now = timezone.now()
    survey = get_object_or_404(
        Survey, 
        pk=pk, 
        is_active=True
    )
    
    # Verificar si expiró
    if survey.expires_at and survey.expires_at <= now:
        raise Http404("Esta encuesta ha expirado")
    
    return render(request, 'surveys/survey_detail.html', {'survey': survey})

def survey_results(request, pk):
    survey = get_object_or_404(Survey, pk=pk)
    responses = Response.objects.filter(survey=survey).order_by('-submitted_at')
    return render(request, 'surveys/survey_results.html', {
        'survey': survey,
        'responses': responses
    })

@login_required
def create_survey(request):
    SurveyForm = modelform_factory(Survey, fields=['title', 'description', 'is_active'])
    QuestionFormSet = inlineformset_factory(Survey, Question, fields=['text', 'type'], extra=1, can_delete=True)

    if request.method == 'POST':
        form = SurveyForm(request.POST)
        formset = QuestionFormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            survey = form.save(commit=False)    # importante: commit=False para asignar creator
            survey.creator = request.user
            survey.save()
            formset.instance = survey
            formset.save()
            return redirect('surveys:survey_detail', pk=survey.pk)
    else:
        form = SurveyForm()
        formset = QuestionFormSet()

    return render(request, 'surveys/create_survey.html', {'form': form, 'formset': formset})
