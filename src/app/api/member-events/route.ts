import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 4_000;
const MAX_LOCATION_LENGTH = 300;

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, maxLength) || undefined;
}

async function getMemberSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.email ? session : null;
}

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = await getDb('abg-website');
    const events = await db.collection('MemberEvent').find({}).sort({ eventDate: 1 }).toArray();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to load member events:', error);
    return NextResponse.json({ error: 'Failed to load member events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
    }
    const eventInput = body as Record<string, unknown>;
    const title = optionalText(eventInput.title, MAX_TITLE_LENGTH);
    const eventDate = new Date(String(eventInput.eventDate || ''));
    const endDate = new Date(String(eventInput.endDate || ''));

    if (!title || Number.isNaN(eventDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Title, start time, and end time are required' }, { status: 400 });
    }
    if (endDate <= eventDate) {
      return NextResponse.json({ error: 'End time must be after the start time' }, { status: 400 });
    }

    const now = new Date();
    const event = {
      id: crypto.randomUUID(),
      title,
      description: optionalText(eventInput.description, MAX_DESCRIPTION_LENGTH),
      location: optionalText(eventInput.location, MAX_LOCATION_LENGTH),
      eventDate,
      endDate,
      createdBy: {
        id: session.user.id,
        name: session.user.name || undefined,
        email: session.user.email,
      },
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb('abg-website');
    const result = await db.collection('MemberEvent').insertOne(event);
    return NextResponse.json({ ...event, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Failed to create member event:', error);
    return NextResponse.json({ error: 'Failed to create member event' }, { status: 500 });
  }
}
