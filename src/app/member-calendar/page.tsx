'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline';
import EventCalendar from '@/components/EventCalendar';
import type { CalendarItem } from '@/lib/calendar-links';

type MemberEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  eventDate: string;
  endDate: string;
};

const initialForm = { title: '', start: '', end: '', location: '', description: '' };

export default function MemberCalendarPage() {
  const { status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<MemberEvent[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin?callbackUrl=/member-calendar');
  }, [router, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/member-events')
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || 'Unable to load events');
        return response.json();
      })
      .then((data) => setEvents(data))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load events'))
      .finally(() => setLoading(false));
  }, [status]);

  const calendarItems = useMemo<CalendarItem[]>(() => events.flatMap((event) => {
    const start = new Date(event.eventDate);
    const end = new Date(event.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    return [{
      id: event.id,
      title: event.title,
      start,
      end,
      description: event.description,
      location: event.location,
    }];
  }), [events]);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (new Date(form.end) <= new Date(form.start)) {
      setError('End time must be after the start time.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/member-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          eventDate: new Date(form.start).toISOString(),
          endDate: new Date(form.end).toISOString(),
          location: form.location,
          description: form.description,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create event');
      setEvents((current) => [...current, data].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()));
      setForm(initialForm);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create event');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <main className="min-h-screen bg-[#00274c] px-4 py-20 text-center text-white">Loading member calendar…</main>;
  }

  return (
    <main className="min-h-screen bg-[#00274c] px-4 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ffcb05]/30 bg-[#ffcb05]/10 px-3 py-1 text-xs font-semibold text-[#ffcb05]">
            <CalendarDaysIcon className="h-4 w-4" /> Members only
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Member Calendar</h1>
          <p className="mt-2 max-w-2xl text-blue-100">Plan study sessions, project meetups, and community events with other ABG members.</p>
        </header>

        <form onSubmit={createEvent} className="rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-lg font-bold"><PlusIcon className="h-5 w-5 text-[#ffcb05]" /> Add an event</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Title<input required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-gray-900" /></label>
            <label className="text-sm font-medium">Location (optional)<input maxLength={300} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-gray-900" /></label>
            <label className="text-sm font-medium">Starts<input required type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-gray-900" /></label>
            <label className="text-sm font-medium">Ends<input required type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-gray-900" /></label>
            <label className="text-sm font-medium sm:col-span-2">Details (optional)<textarea maxLength={4000} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-gray-900" /></label>
          </div>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <button disabled={saving} className="mt-4 rounded-lg bg-[#ffcb05] px-4 py-2 text-sm font-bold text-[#00274c] hover:bg-[#ffd633] disabled:opacity-60">{saving ? 'Adding…' : 'Add member event'}</button>
        </form>

        {loading ? <p className="text-blue-100">Loading events…</p> : <EventCalendar items={calendarItems} theme="dark" />}
      </div>
    </main>
  );
}
