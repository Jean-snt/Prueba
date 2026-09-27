from django.shortcuts import render, redirect
from .models import Survey
from .forms import SurveyForm

def my_surveys(request):
    surveys = Survey.objects.all()
    return render(request, 'surveys/survey_list.html', {'surveys': surveys})

def create_survey(request):
    if request.method == 'POST':
        form = SurveyForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('surveys:survey_thanks')
    else:
        form = SurveyForm()
    return render(request, 'surveys/survey_form.html', {'form': form})

def survey_thanks(request):
    return render(request, 'surveys/survey_thanks.html')
