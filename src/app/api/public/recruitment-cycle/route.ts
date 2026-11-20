/**
 * Public API to get active recruitment cycle info
 * Returns basic cycle info including deadline for homepage display
 */

import { NextResponse } from 'next/server';
import { getActiveCycle, getUpcomingCycle, getEventsByCycle } from '@/lib/recruitment/db';

export async function GET() {
  try {
    const active = await getActiveCycle();
    const cycle = active || await getUpcomingCycle();
    if (cycle) {
      const records = cycle._id ? await getEventsByCycle(cycle._id) : [];
      const events = records.map(({ title, startAt, endAt, venue, location, eventType }) => ({
        title, startAt, endAt, venue, location, eventType,
      }));
      return NextResponse.json({
        isActive: Boolean(active), isUpcoming: !active, cycleName: cycle.name,
        portalOpenAt: cycle.portalOpenAt, portalCloseAt: cycle.portalCloseAt,
        applicationDueAt: cycle.applicationDueAt, portalUrl: '/portal', events,
      });
    }

    // No active or upcoming cycle
    return NextResponse.json({
      isActive: false,
      isUpcoming: false,
      message: 'No active recruitment cycle',
    });
  } catch (error) {
    console.error('Error fetching recruitment cycle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recruitment cycle info' },
      { status: 500 }
    );
  }
}
