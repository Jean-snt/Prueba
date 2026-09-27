"""
Gender Value Object - Represents gender in the domain
"""
from enum import Enum


class Gender(Enum):
    """Gender enumeration for domain entities"""
    MALE = "M"
    FEMALE = "F"
    OTHER = "O"
    ANONYMOUS = "A"
    PREFER_NOT_TO_SAY = "N"
    
    @classmethod
    def from_string(cls, value: str):
        """Create Gender from string value"""
        if not value:
            return cls.ANONYMOUS
        
        value = value.upper()
        for gender in cls:
            if gender.value == value:
                return gender
        
        return cls.ANONYMOUS
    
    def to_display_string(self) -> str:
        """Get display string for gender"""
        display_map = {
            self.MALE: "Masculino",
            self.FEMALE: "Femenino", 
            self.OTHER: "Otro",
            self.ANONYMOUS: "Anónimo",
            self.PREFER_NOT_TO_SAY: "Prefiero no decir"
        }
        return display_map.get(self, "Anónimo")
    
    def get_color(self) -> str:
        """Get color associated with gender for UI"""
        color_map = {
            self.MALE: '#E3F2FD',      # Blue
            self.FEMALE: '#FCE4EC',    # Pink
            self.OTHER: '#F3E5F5',     # Purple
            self.ANONYMOUS: '#F5F5F5', # Gray
            self.PREFER_NOT_TO_SAY: '#F5F5F5', # Gray
        }
        return color_map.get(self, '#F5F5F5')