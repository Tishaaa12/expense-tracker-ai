import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      );
    }

    // Get user's preferred currency for context
    await dbConnect();
    const user = await User.findById(userId);
    const preferredCurrency = user?.currency || 'USD';

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            expenses: {
              type: SchemaType.ARRAY,
              description:
                'List of extracted expenses. Each separate payment/transaction is one item. For a single receipt with multiple line items, use ONE entry with the TOTAL amount paid.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  amount: {
                    type: SchemaType.NUMBER,
                    description:
                      'The positive monetary amount for this expense, in its original currency. Do NOT convert.',
                  },
                  detectedCurrency: {
                    type: SchemaType.STRING,
                    description:
                      'ISO currency code detected (INR, USD, EUR, GBP, JPY). Default to ' +
                      preferredCurrency +
                      ' if undetectable.',
                  },
                  category: {
                    type: SchemaType.STRING,
                    enum: [
                      'Food',
                      'Transport',
                      'Utilities',
                      'Entertainment',
                      'Health',
                      'Shopping',
                      'Others',
                    ],
                    description: 'Best-fit expense category.',
                  },
                  date: {
                    type: SchemaType.STRING,
                    description: 'Transaction date in YYYY-MM-DD format.',
                  },
                  note: {
                    type: SchemaType.STRING,
                    description:
                      'Short clean merchant/description note (e.g. "Netflix subscription", "Apollo Pharmacy", "Uber ride").',
                  },
                },
                required: [
                  'amount',
                  'detectedCurrency',
                  'category',
                  'date',
                  'note',
                ],
              },
            },
          },
          required: ['expenses'],
        } as any,
      },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const prompt = `You are a financial AI that extracts expense data from text (SMS alerts, bank notifications, receipts, bills).

Text input:
"""
${text}
"""

Rules:
1. Identify every DISTINCT payment/transaction. Each unique payment = one entry in 'expenses'.
2. For a single-store RECEIPT with multiple line items → use ONE entry with the TOTAL amount paid (not the subtotal, not the individual items; ignore taxes breakdown).
3. For multiple separate SMS/NEFT/bank alerts pasted together → create one entry PER alert.
4. Store the raw positive amount in 'amount'. Do NOT convert currencies — preserve the original value.
5. Detect the currency symbol/word (Rs / INR / ₹ → INR; $ / USD → USD; € / EUR → EUR; £ / GBP → GBP; ¥ / JPY → JPY). Default to ${preferredCurrency} if undetectable.
6. Map the category: Food, Transport, Utilities, Entertainment, Health, Shopping, Others.
7. Extract the date (YYYY-MM-DD). Today is ${todayStr}. Use today if not explicitly mentioned.
8. Write a concise clean merchant note. Exclude reference numbers, store codes, POS IDs.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('AI extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse text' },
      { status: 500 }
    );
  }
}
