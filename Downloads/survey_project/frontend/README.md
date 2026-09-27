# Frontend React - Sistema de Encuestas

Este es el frontend moderno desarrollado en React para el sistema de encuestas Django.

## 🚀 Características

- **Interfaz moderna**: Diseño limpio y profesional con Material-UI
- **Responsive**: Adaptable a dispositivos móviles y desktop
- **Componentes interactivos**: Formularios dinámicos, gráficos y estadísticas
- **Navegación fluida**: React Router para una experiencia de usuario óptima
- **Visualización de datos**: Gráficos interactivos con Recharts

## 📦 Componentes Principales

### 1. **SurveyList** - Lista de Encuestas
- Muestra todas las encuestas disponibles
- Cards interactivos con información detallada
- Filtros por estado (activa/inactiva)
- Navegación directa a responder o ver detalles

### 2. **SurveyDetail** - Detalles de Encuesta
- Información completa de la encuesta
- Lista de preguntas con tipos y opciones
- Botones para responder o ver resultados
- Formato visual atractivo

### 3. **SurveyForm** - Formulario de Respuesta
- Formulario paso a paso (Stepper)
- Diferentes tipos de preguntas:
  - Texto libre
  - Opción única (radio)
  - Opción múltiple (checkbox)
  - Lista desplegable (select)
  - Escala 1-5 (slider)
- Validación y revisión antes del envío
- Feedback visual de éxito

### 4. **SurveyResults** - Resultados y Estadísticas
- Gráficos de barras para escalas
- Gráficos de pie para opciones múltiples
- Estadísticas generales (total respuestas, tasa de completación)
- Visualización interactiva de datos

## 🛠️ Tecnologías Utilizadas

- **React 19.2.0** - Framework principal
- **Material-UI 7.3.4** - Componentes de interfaz
- **React Router DOM 7.9.4** - Navegación
- **Axios 1.12.2** - Cliente HTTP
- **Recharts 3.3.0** - Gráficos y visualizaciones

## 🚀 Instalación y Uso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar el servidor de desarrollo
```bash
npm start
```

El frontend estará disponible en: http://localhost:3000

### 3. Construir para producción
```bash
npm run build
```

## 🔗 Integración con Django

El frontend se conecta con el backend Django a través de la API REST:

- **Base URL**: `http://127.0.0.1:8000/encuestas/api/`
- **Endpoints principales**:
  - `GET /surveys/` - Lista de encuestas
  - `GET /surveys/{id}/` - Detalles de encuesta
  - `POST /surveys/{id}/submit/` - Enviar respuesta

## 📱 Características de UX/UI

- **Diseño Material Design**: Siguiendo las mejores prácticas de Google
- **Animaciones suaves**: Transiciones y efectos visuales
- **Responsive Design**: Adaptable a todos los tamaños de pantalla
- **Accesibilidad**: Componentes accesibles y navegación por teclado
- **Feedback visual**: Loading states, mensajes de éxito/error
- **Navegación intuitiva**: Breadcrumbs y navegación clara

## 🎨 Temas y Personalización

El tema está configurado con:
- **Colores primarios**: Púrpura (#9c27b0)
- **Colores secundarios**: Púrpura claro (#ba68c8)
- **Tipografía**: Roboto (Google Fonts)
- **Bordes redondeados**: 12px para un look moderno

## 📊 Funcionalidades Avanzadas

- **Formularios dinámicos**: Se adaptan al tipo de pregunta
- **Validación en tiempo real**: Feedback inmediato al usuario
- **Gráficos interactivos**: Tooltips y zoom en visualizaciones
- **Estados de carga**: Indicadores visuales durante las operaciones
- **Manejo de errores**: Mensajes claros y recuperación de errores

## 🔧 Configuración Adicional

Para personalizar la aplicación:

1. **Colores**: Modifica el tema en `src/App.js`
2. **API URL**: Cambia la base URL en `src/services/api.js`
3. **Componentes**: Personaliza los componentes en `src/components/`
4. **Estilos**: Añade estilos globales en `src/index.css`