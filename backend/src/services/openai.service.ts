import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface ReceiptData {
    amount: number;
    date: string;
    merchant?: string;
    category?: string;
    items?: string[];
}

export async function analyzeReceipt(imageBase64: string): Promise<ReceiptData> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analiza esta factura y extrae la siguiente información en formato JSON:
              {
                "amount": número total de la factura,
                "date": fecha en formato YYYY-MM-DD,
                "merchant": nombre del comercio,
                "category": categoría sugerida (Alimentación, Transporte, Salud, etc.),
                "items": array de items comprados (opcional)
              }
              
              Si no puedes encontrar algún dato, usa null. Responde SOLO con el JSON, sin texto adicional.`,
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
            max_tokens: 500,
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        // Parse JSON response
        const data = JSON.parse(content);
        return data;
    } catch (error) {
        console.error('Error analyzing receipt:', error);
        throw new Error('Failed to analyze receipt');
    }
}
