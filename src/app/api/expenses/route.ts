import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Expense from '@/models/Expense';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    await dbConnect();

    const query: any = { userId };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (month && month !== 'All') {
      const [year, m] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(m) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(m), 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const skip = (page - 1) * limit;

    const expenses = await Expense.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Expense.countDocuments(query);

    return NextResponse.json({
      expenses,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, category, date, note, currency } = body;

    if (!amount || !category || !date) {
      return NextResponse.json(
        { error: 'Amount, category, and date are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const expense = await Expense.create({
      userId,
      amount: Number(amount),
      currency: (currency || 'USD').toUpperCase(),
      category,
      date: new Date(date),
      note: note || '',
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
