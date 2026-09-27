from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.contrib import messages
from ..models.survey import Survey, Question, Choice
from ..models.response import Response, Answer

@login_required
def submit_response(request, pk):
    survey = get_object_or_404(Survey, pk=pk, is_active=True)
    questions = survey.questions.all().prefetch_related('choices')
    scale_range = range(1, 6)

    if request.method == 'POST':
        with transaction.atomic():
            resp = Response.objects.create(survey=survey, user=request.user)

            for q in questions:
                key = f'question_{q.id}'
                if q.type in ['radio', 'select', 'scale']:
                    choice_id = request.POST.get(key)
                    if choice_id:
                        try:
                            choice = Choice.objects.get(pk=int(choice_id), question=q)
                        except (ValueError, Choice.DoesNotExist):
                            choice = None
                        Answer.objects.create(response=resp, question=q, choice=choice)

                elif q.type == 'checkbox':
                    choice_ids = request.POST.getlist(key)
                    for cid in choice_ids:
                        try:
                            choice = Choice.objects.get(pk=int(cid), question=q)
                        except (ValueError, Choice.DoesNotExist):
                            continue
                        Answer.objects.create(response=resp, question=q, choice=choice)

                else:
                    text = request.POST.get(key, '').strip()
                    Answer.objects.create(response=resp, question=q, text_answer=text)

            # Guardar comentario general si se proporciona
            general_comment = request.POST.get('general_comment', '').strip()
            if general_comment:
                resp.general_comment = general_comment
                resp.save()

        messages.success(request, "Gracias — tu respuesta ha sido registrada.")
        return redirect('surveys:survey_thanks')

    return render(request, 'surveys/submit_response.html', {
        'survey': survey,
        'questions': questions,
        'scale_range': scale_range,
    })

@login_required
def survey_thanks(request):
    return render(request, 'surveys/thanks.html')