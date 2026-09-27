from django.db import models
from .survey import Survey, Question, Choice
from django.contrib.auth.models import User
from django_countries.fields import CountryField
import bleach
import markdown


class Response(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    country = CountryField(blank=True, null=True, verbose_name="País")
    submitted_at = models.DateTimeField(auto_now_add=True)
    general_comment = models.TextField(blank=True, null=True)  # Comentario general opcional

    def __str__(self):
        return f"Response #{self.id} to '{self.survey.title}'"
    
    def get_safe_comment_html(self):
        """
        Convierte el comentario a HTML seguro, permitiendo solo tags seguros
        """
        if not self.general_comment:
            return ""
        
        # Tags HTML permitidos para GIFs e imágenes
        allowed_tags = [
            'p', 'br', 'strong', 'em', 'u', 'img', 'a', 'span', 'div'
        ]
        
        # Atributos permitidos
        allowed_attributes = {
            'img': ['src', 'alt', 'style', 'width', 'height'],
            'a': ['href', 'title'],
            'span': ['style'],
            'div': ['style']
        }
        
        # Protocolos permitidos para URLs
        allowed_protocols = ['http', 'https']
        
        # Sanitizar el HTML
        clean_html = bleach.clean(
            self.general_comment,
            tags=allowed_tags,
            attributes=allowed_attributes,
            protocols=allowed_protocols,
            strip=True
        )
        
        return clean_html
    
    def get_comment_as_markdown(self):
        """
        Convierte el comentario de Markdown a HTML si es necesario
        """
        if not self.general_comment:
            return ""
        
        # Si el comentario contiene HTML (como GIFs), devolverlo como está
        if '<img' in self.general_comment or '<' in self.general_comment:
            return self.get_safe_comment_html()
        
        # Si es texto plano, convertir de Markdown a HTML
        html = markdown.markdown(self.general_comment)
        return bleach.clean(html, tags=['p', 'br', 'strong', 'em', 'u'], strip=True)


class Answer(models.Model):
    response = models.ForeignKey(Response, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    choice = models.ForeignKey(Choice, on_delete=models.SET_NULL, null=True, blank=True)
    text_answer = models.TextField(blank=True, null=True)

    def __str__(self):
        if self.choice:
            return f"Answer to '{self.question.text}': {self.choice.text}"
        elif self.text_answer:
            return f"Answer to '{self.question.text}': {self.text_answer}"
        return f"Answer to '{self.question.text}' (no response)"
