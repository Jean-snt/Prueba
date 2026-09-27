/**
 * AWS Lambda Function: procesar-pago-cuestom
 * Procesa pagos VIP para Cuestom con soporte CORS completo
 * Compatible con API Gateway HTTP API (Payload 2.0)
 */

exports.handler = async (event) => {
    // ✅ CORS Headers - Aplicar a todas las respuestas
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // ✅ WRAPPER DE SEGURIDAD: Capturar TODOS los errores
    try {
        // ✅ LOG: Evento completo para debugging
        console.log('Event recibido:', JSON.stringify(event, null, 2));

        // ✅ DETECTAR MÉTODO: API Gateway HTTP API (Payload 2.0)
        const method = event.requestContext?.http?.method || event.httpMethod || 'UNKNOWN';
        console.log('Método HTTP detectado:', method);

        // ✅ PREFLIGHT: Manejar peticiones OPTIONS
        if (method === 'OPTIONS') {
            console.log('Respondiendo a preflight OPTIONS');
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'CORS preflight successful' })
            };
        }

        // ✅ VALIDACIÓN: Solo permitir POST
        if (method !== 'POST') {
            console.log('Método no permitido:', method);
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    message: `Método no permitido: ${method}. Use POST.`
                })
            };
        }

        // ✅ PARSEAR BODY con manejo de errores robusto
        let body;
        try {
            console.log('Body raw:', event.body);
            console.log('Tipo de body:', typeof event.body);
            
            if (!event.body) {
                throw new Error('Body vacío o undefined');
            }
            
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            console.log('Body parseado exitosamente:', JSON.stringify(body, null, 2));
            
        } catch (parseError) {
            console.error('Error parseando body:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    message: 'Body inválido. Debe ser JSON válido.',
                    error: parseError.message,
                    receivedBody: event.body
                })
            };
        }

        // ✅ EXTRAER Y VALIDAR DATOS REQUERIDOS
        const { userId, planId, tokenPago, cardData } = body;
        
        console.log('Datos extraídos:', {
            userId,
            planId,
            tokenPago: tokenPago ? 'presente' : 'ausente',
            cardData: cardData ? 'presente' : 'ausente'
        });

        // ✅ VALIDACIÓN: Campos requeridos
        const missingFields = [];
        if (!userId) missingFields.push('userId');
        if (!planId) missingFields.push('planId');
        if (!tokenPago) missingFields.push('tokenPago');

        if (missingFields.length > 0) {
            console.error('Faltan campos requeridos:', missingFields);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    message: `Faltan datos requeridos: ${missingFields.join(', ')}`,
                    receivedData: { userId, planId, tokenPago: tokenPago ? 'presente' : 'ausente' }
                })
            };
        }

        // ✅ VALIDAR PLAN
        const validPlans = ['monthly', 'quarterly', 'annual'];
        if (!validPlans.includes(planId)) {
            console.error('Plan inválido:', planId);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    message: `Plan inválido: "${planId}". Debe ser uno de: ${validPlans.join(', ')}`,
                    receivedPlan: planId
                })
            };
        }

        // ✅ CALCULAR MONTO SEGÚN PLAN
        const planPrices = {
            'monthly': 2.70,
            'quarterly': 7.70,
            'annual': 29.16
        };
        const amount = planPrices[planId];

        // ✅ LOG: Procesamiento de pago
        console.log('✅ Procesando pago:', {
            userId,
            planId,
            amount,
            tokenPago,
            cardData: cardData ? {
                lastFourDigits: cardData.lastFourDigits,
                cardName: cardData.cardName
            } : null,
            timestamp: new Date().toISOString()
        });

        // ✅ SIMULAR PROCESAMIENTO (1 segundo)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ✅ AQUÍ INTEGRARÍAS CON TU BACKEND DE DJANGO
        // Ejemplo:
        // const backendResponse = await fetch('https://tu-backend.com/api/activate-vip', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ userId, planId, transactionId: tokenPago })
        // });

        // ✅ RESPUESTA EXITOSA
        const successResponse = {
            success: true,
            message: 'Pago procesado exitosamente',
            data: {
                transactionId: tokenPago,
                userId: userId,
                planId: planId,
                amount: amount,
                currency: 'USD',
                status: 'completed',
                timestamp: new Date().toISOString()
            }
        };

        console.log('✅ Pago exitoso:', successResponse);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(successResponse)
        };

    } catch (error) {
        // ✅ MANEJO DE ERRORES GLOBAL
        console.error('❌ Error crítico en Lambda:', error);
        console.error('Stack trace:', error.stack);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                message: 'Error interno del servidor al procesar el pago',
                error: error.message,
                errorType: error.name,
                timestamp: new Date().toISOString()
            })
        };
    }
};
