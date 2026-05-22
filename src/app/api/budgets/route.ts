import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category, limit } = await request.json();

    if (!category || limit === undefined) {
      return NextResponse.json(
        { error: 'Category and limit are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.budgets) {
      user.budgets = new Map();
    }

    user.budgets.set(category, Number(limit));
    await user.save();

    return NextResponse.json({
      message: 'Budget limit updated successfully',
      budgets: user.budgets,
    });
  } catch (error: any) {
    console.error('Update budget error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
