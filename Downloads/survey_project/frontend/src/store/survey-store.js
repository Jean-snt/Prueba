import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { surveyAPI } from '../services/api';

// Survey Store - Manejo de estado para encuestas
const useSurveyStore = create()(
  devtools(
    persist(
      (set, get) => ({
        // Estado inicial
        surveys: [],
        currentSurvey: null,
        surveyQuestions: [],
        surveyStats: {},
        loading: false,
        error: null,
        
        // Filtros y paginación
        filters: {
          search: '',
          isActive: null,
          creator: null,
          sortBy: 'created_at',
          sortOrder: 'desc',
        },
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          hasMore: true,
        },

        // Actions - Cargar encuestas
        fetchSurveys: async (options = {}) => {
          set({ loading: true, error: null });
          
          try {
            const response = await surveyAPI.getAllSurveys();
            const surveys = response.data.surveys || [];
            
            // Aplicar filtros localmente si es necesario
            let filteredSurveys = surveys;
            const { filters } = get();
            
            if (filters.search) {
              filteredSurveys = filteredSurveys.filter(survey =>
                survey.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                survey.description?.toLowerCase().includes(filters.search.toLowerCase())
              );
            }
            
            if (filters.isActive !== null) {
              filteredSurveys = filteredSurveys.filter(survey => 
                survey.is_active === filters.isActive
              );
            }
            
            // Ordenar
            filteredSurveys.sort((a, b) => {
              const aValue = a[filters.sortBy];
              const bValue = b[filters.sortBy];
              
              if (filters.sortOrder === 'desc') {
                return new Date(bValue) - new Date(aValue);
              }
              return new Date(aValue) - new Date(bValue);
            });
            
            set({
              surveys: filteredSurveys,
              loading: false,
              pagination: {
                ...get().pagination,
                total: filteredSurveys.length,
                hasMore: false, // Para implementar paginación real más tarde
              }
            });
            
          } catch (error) {
            console.error('Error fetching surveys:', error);
            set({ 
              error: 'Error al cargar las encuestas',
              loading: false 
            });
          }
        },

        // Cargar encuesta específica
        fetchSurvey: async (surveyId) => {
          set({ loading: true, error: null });
          
          try {
            const response = await surveyAPI.getSurvey(surveyId);
            const survey = response.data.survey;
            const questions = response.data.questions || [];
            const stats = response.data.country_stats || {};
            
            set({
              currentSurvey: survey,
              surveyQuestions: questions,
              surveyStats: stats,
              loading: false,
            });
            
            return { survey, questions, stats };
            
          } catch (error) {
            set({ 
              error: 'Error al cargar la encuesta',
              loading: false 
            });
            throw error;
          }
        },

        // Enviar respuesta a encuesta
        submitSurveyResponse: async (surveyId, responseData) => {
          set({ loading: true, error: null });
          
          try {
            const response = await surveyAPI.submitResponse(surveyId, responseData);
            
            if (response.data.ok) {
              // Actualizar contador de respuestas en la encuesta actual
              const { currentSurvey, surveys } = get();
              
              if (currentSurvey && currentSurvey.id === surveyId) {
                const updatedSurvey = {
                  ...currentSurvey,
                  response_count: (currentSurvey.response_count || 0) + 1
                };
                
                set({
                  currentSurvey: updatedSurvey,
                  surveys: surveys.map(s => 
                    s.id === surveyId ? updatedSurvey : s
                  ),
                  loading: false,
                });
              }
              
              return response.data;
            }
            
          } catch (error) {
            set({ 
              error: 'Error al enviar la respuesta',
              loading: false 
            });
            throw error;
          }
        },

        // Actualizar filtros
        updateFilters: (newFilters) => {
          set(state => ({
            filters: { ...state.filters, ...newFilters },
            pagination: { ...state.pagination, page: 1 } // Reset page
          }));
          
          // Re-fetch con nuevos filtros
          get().fetchSurveys();
        },

        // Limpiar filtros
        clearFilters: () => {
          set({
            filters: {
              search: '',
              isActive: null,
              creator: null,
              sortBy: 'created_at',
              sortOrder: 'desc',
            },
            pagination: {
              page: 1,
              limit: 12,
              total: 0,
              hasMore: true,
            }
          });
          
          get().fetchSurveys();
        },

        // Buscar encuestas
        searchSurveys: (searchTerm) => {
          get().updateFilters({ search: searchTerm });
        },

        // Cambiar página
        changePage: (page) => {
          set(state => ({
            pagination: { ...state.pagination, page }
          }));
        },

        // Limpiar encuesta actual
        clearCurrentSurvey: () => {
          set({
            currentSurvey: null,
            surveyQuestions: [],
            surveyStats: {},
          });
        },

        // Limpiar errores
        clearError: () => {
          set({ error: null });
        },

        // Obtener estadísticas generales
        getStats: () => {
          const { surveys } = get();
          
          return {
            totalSurveys: surveys.length,
            activeSurveys: surveys.filter(s => s.is_active).length,
            totalResponses: surveys.reduce((sum, s) => sum + (s.response_count || 0), 0),
            averageResponses: surveys.length > 0 
              ? Math.round(surveys.reduce((sum, s) => sum + (s.response_count || 0), 0) / surveys.length)
              : 0,
          };
        },

        // Obtener encuestas por estado
        getSurveysByStatus: (isActive) => {
          const { surveys } = get();
          return surveys.filter(survey => survey.is_active === isActive);
        },

        // Obtener encuestas recientes
        getRecentSurveys: (limit = 6) => {
          const { surveys } = get();
          return surveys
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
        },

        // Obtener encuestas populares
        getPopularSurveys: (limit = 6) => {
          const { surveys } = get();
          return surveys
            .sort((a, b) => (b.response_count || 0) - (a.response_count || 0))
            .slice(0, limit);
        },

        // Resetear store
        reset: () => {
          set({
            surveys: [],
            currentSurvey: null,
            surveyQuestions: [],
            surveyStats: {},
            loading: false,
            error: null,
            filters: {
              search: '',
              isActive: null,
              creator: null,
              sortBy: 'created_at',
              sortOrder: 'desc',
            },
            pagination: {
              page: 1,
              limit: 12,
              total: 0,
              hasMore: true,
            },
          });
        },
      }),
      {
        name: 'survey-store',
        partialize: (state) => ({
          // Solo persistir datos importantes, no loading states
          surveys: state.surveys,
          filters: state.filters,
          pagination: state.pagination,
        }),
      }
    ),
    {
      name: 'survey-store',
    }
  )
);

export default useSurveyStore;