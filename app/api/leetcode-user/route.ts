import { NextRequest, NextResponse } from 'next/server';
import { LeetCode } from 'leetcode-query';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  console.log('Checking LeetCode username:', username);
  if (!username) {
    console.log('No username provided');
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    const leetcode = new LeetCode();
    const user = await leetcode.user(username);
    console.log('LeetCode user result:', user);
    if (!user || !user.matchedUser || !user.matchedUser.username) {
      console.log('User not found or missing matchedUser');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error('Error fetching user:', err);
    return NextResponse.json({ error: 'Error fetching user' }, { status: 500 });
  }
} 