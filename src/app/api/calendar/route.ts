import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '../auth/[...nextauth]/route'
import { google } from 'googleapis'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { company, role } = await request.json()

  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken as string })
    const calendar = google.calendar({ version: 'v3', auth })

    // Create event 1 week from now as a placeholder
    const start = new Date()
    start.setDate(start.getDate() + 7)
    start.setHours(10, 0, 0, 0)

    const end = new Date(start)
    end.setHours(11, 0, 0, 0)

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Interview - ${company}`,
        description: `${role} interview at ${company}`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}