import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateKundaliViaApi } from '@/lib/prokerala';
import type { BirthDetails } from '@/types/kundali';

export async function POST(req: Request) {
  // Only signed-in users can generate a kundali (this also protects your API credits).
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Please sign in with Google' }, { status: 401 });
  }

  const body = (await req.json()) as Partial<BirthDetails>;
  if (!body.name || !body.dob || !body.tob || !body.place) {
    return NextResponse.json({ error: 'Missing birth details' }, { status: 400 });
  }

  try {
    return NextResponse.json(await calculateKundaliViaApi(body as BirthDetails));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Calculation failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}