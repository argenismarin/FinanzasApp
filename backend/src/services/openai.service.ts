import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface ReceiptData {
    amount: number;
    date: string;
    merchant?: string;
    category?: string;
    items?: Array<{
        name: string;
        quantity?: number;
        price?: number;
    }>;
    taxAmount?: number;
    tipAmount?: number;
    paymentMethod?: string;
    confidence: number;
}

// Analyze receipt with improved OCR
export async function analyzeReceipt(imageBase64: string): Promise<ReceiptData> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de facturas y recibos. Extrae información detallada y precisa de las imágenes.'
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analiza esta factura/recibo y extrae la siguiente información en formato JSON:
{
  "amount": número total de la factura (obligatorio),
  "date": fecha en formato YYYY-MM-DD,
  "merchant": nombre del comercio o establecimiento,
  "category": categoría más apropiada (Alimentación, Transporte, Salud, Entretenimiento, Servicios, Compras, Educación, Vivienda, etc.),
  "items": [
    {
      "name": "nombre del producto/servicio",
      "quantity": cantidad (opcional),
      "price": precio unitario (opcional)
    }
  ],
  "taxAmount": monto de impuestos/IVA (opcional),
  "tipAmount": propina (opcional),
  "paymentMethod": método de pago si está visible (efectivo, tarjeta, etc),
  "confidence": tu nivel de confianza en la extracción (0-100)
}

Reglas importantes:
- El amount debe ser el total final a pagar
- Si la fecha no es clara, usa la fecha actual
- Sugiere la categoría más apropiada según el contexto
- Extrae todos los items que puedas ver claramente
- confidence debe reflejar qué tan clara está la información

Responde SOLO con el JSON válido, sin texto adicional.`,
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
            temperature: 0.3, // Más determinístico para OCR
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        // Parse JSON response
        const data = JSON.parse(content.trim());
        
        // Validate required fields
        if (!data.amount) {
            throw new Error('No amount found in receipt');
        }

        return {
            ...data,
            confidence: data.confidence || 75 // Default confidence
        };
    } catch (error) {
        console.error('Error analyzing receipt:', error);
        throw new Error('Failed to analyze receipt');
    }
}

// Financial advisor chatbot
export async function getFinancialAdvice(
    question: string,
    context?: {
        monthlyIncome?: number;
        monthlyExpenses?: number;
        savings?: number;
        debts?: number;
    }
): Promise<string> {
    try {
        let systemMessage = `Eres un asesor financiero experto especializado en finanzas personales para Colombia. 
Proporciona consejos claros, prácticos y personalizados en español. 
Usa pesos colombianos (COP) en tus ejemplos.
Sé conciso pero informativo.`;

        let userMessage = question;

        if (context) {
            const contextInfo = [];
            if (context.monthlyIncome) contextInfo.push(`Ingreso mensual: $${context.monthlyIncome.toLocaleString('es-CO')}`);
            if (context.monthlyExpenses) contextInfo.push(`Gastos mensuales: $${context.monthlyExpenses.toLocaleString('es-CO')}`);
            if (context.savings) contextInfo.push(`Ahorros: $${context.savings.toLocaleString('es-CO')}`);
            if (context.debts) contextInfo.push(`Deudas: $${context.debts.toLocaleString('es-CO')}`);

            if (contextInfo.length > 0) {
                userMessage = `Mi situación financiera:\n${contextInfo.join('\n')}\n\nPregunta: ${question}`;
            }
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: systemMessage
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        return content.trim();
    } catch (error) {
        console.error('Error getting financial advice:', error);
        throw new Error('Failed to get financial advice');
    }
}

// Analyze spending patterns
export async function analyzeSpendingPatterns(
    transactions: Array<{
        date: string;
        category: string;
        amount: number;
        description: string;
    }>
): Promise<string> {
    try {
        const summary = transactions.reduce((acc, t) => {
            if (!acc[t.category]) {
                acc[t.category] = { total: 0, count: 0 };
            }
            acc[t.category].total += t.amount;
            acc[t.category].count += 1;
            return acc;
        }, {} as Record<string, { total: number; count: number }>);

        const summaryText = Object.entries(summary)
            .map(([cat, data]) => `- ${cat}: $${data.total.toLocaleString('es-CO')} (${data.count} transacciones)`)
            .join('\n');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un analista financiero que identifica patrones de gasto y proporciona insights útiles en español.'
                },
                {
                    role: 'user',
                    content: `Analiza estos gastos y proporciona insights concisos (máximo 3 puntos):

${summaryText}

Identifica:
1. Las categorías con mayor gasto
2. Oportunidades de ahorro
3. Recomendaciones específicas

Sé breve y directo.`
                }
            ],
            max_tokens: 300,
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        return content.trim();
    } catch (error) {
        console.error('Error analyzing spending patterns:', error);
        throw new Error('Failed to analyze spending patterns');
    }
}

// Suggest budget based on income
export async function suggestBudget(monthlyIncome: number): Promise<Record<string, number>> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un asesor financiero que sugiere presupuestos balanceados usando la regla 50/30/20.'
                },
                {
                    role: 'user',
                    content: `Para un ingreso mensual de $${monthlyIncome.toLocaleString('es-CO')} COP, sugiere un presupuesto detallado por categorías.
Responde en formato JSON:
{
  "Vivienda": monto,
  "Alimentación": monto,
  "Transporte": monto,
  "Servicios": monto,
  "Salud": monto,
  "Entretenimiento": monto,
  "Ahorros": monto,
  "Otros": monto
}

Los montos deben sumar aproximadamente ${monthlyIncome}. Responde SOLO con el JSON.`
                }
            ],
            max_tokens: 300,
            temperature: 0.5,
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const budget = JSON.parse(content.trim());
        return budget;
    } catch (error) {
        console.error('Error suggesting budget:', error);
        throw new Error('Failed to suggest budget');
    }
}

