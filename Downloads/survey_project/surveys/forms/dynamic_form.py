from django import forms
from ..models.survey import Question, Choice

class DynamicSurveyForm(forms.Form):
    def __init__(self, *args, **kwargs):
        questions = kwargs.pop('questions')
        super(DynamicSurveyForm, self).__init__(*args, **kwargs)

        for question in questions:
            field_name = f"question_{question.id}"

            if question.type == 'text':
                self.fields[field_name] = forms.CharField(label=question.text, required=True)

            elif question.type == 'radio':
                choices = [(c.id, c.text) for c in question.choices.all()]
                self.fields[field_name] = forms.ChoiceField(
                    label=question.text,
                    widget=forms.RadioSelect,
                    choices=choices,
                    required=True
                )

            elif question.type == 'checkbox':
                choices = [(c.id, c.text) for c in question.choices.all()]
                self.fields[field_name] = forms.MultipleChoiceField(
                    label=question.text,
                    widget=forms.CheckboxSelectMultiple,
                    choices=choices,
                    required=True
                )

            elif question.type == 'select':
                choices = [(c.id, c.text) for c in question.choices.all()]
                self.fields[field_name] = forms.ChoiceField(
                    label=question.text,
                    widget=forms.Select,
                    choices=choices,
                    required=True
                )

            elif question.type == 'scale':
                self.fields[field_name] = forms.IntegerField(
                    label=question.text,
                    min_value=1,
                    max_value=5,
                    required=True
                )
