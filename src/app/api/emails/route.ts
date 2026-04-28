import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { fetchRecruiterEmails, isLikelyJobEmail } from '@/src/lib/gmail'
import { parseEmail } from '@/src/lib/send-to-claude'
import { supabase } from '@/src/lib/supabase'
import { authOptions } from '../auth/[...nextauth]/route'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user?.email || 'temp-user'

  try {
    const emails = await fetchRecruiterEmails(session.accessToken as string)

    const testEmails = [
      {
        gmailId: 'test-123',
        subject: 'Software Engineer Interview Invitation - Chewy',
        from: 'recruiting@chewy.com',
        date: new Date().toISOString(),
        body: `Hi Brigit, 
      
We reviewed your application for the Software Engineer position at Chewy and would love to schedule an interview with you. 
      
Please let us know your availability for a 45-minute video call next week.
      
Best,
Sarah Johnson
Talent Acquisition, Chewy`
      },
      {
        gmailId: 'test-456',
        subject: 'Your application to Frontend Engineer at Zillow',
        from: 'no-reply@zillow.com',
        date: new Date().toISOString(),
        body: `Hi Brigit,
      
Thank you for applying to the Frontend Engineer role at Zillow. We have received your application and will be in touch shortly.
      
The Zillow Recruiting Team`
      }
    ]

    const allEmails = [...testEmails, ...emails]
    const results: any[] = []

    for (const email of allEmails) {
      console.log('Subject:', email.subject, '| From:', email.from)
      if (!isLikelyJobEmail(email.subject, email.from)) {
        console.log('FILTERED OUT:', email.subject)
        continue
      }

      const parsed = await parseEmail(email.subject, email.from, email.body)
      await sleep(2000)

      if (!parsed.isJobRelated) continue

      let jobId: string | null = null
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', userId)
        .eq('company', parsed.company || '')
        .single()

      if (existingJob) {
        jobId = existingJob.id
        if (parsed.status) {
          await supabase
            .from('jobs')
            .update({ status: parsed.status, last_updated: new Date().toISOString() })
            .eq('id', jobId)
        }
      } else if (parsed.company) {
        const { data: newJob } = await supabase
          .from('jobs')
          .insert({
            user_id: userId,
            company: parsed.company,
            role: parsed.role,
            status: parsed.status || 'applied',
            applied_date: new Date(email.date).toISOString(),
          })
          .select()
          .single()

        jobId = newJob?.id || null
      }

      if (jobId) {
        await supabase.from('emails').upsert({
          user_id: userId,
          job_id: jobId,
          gmail_id: email.gmailId,
          subject: email.subject,
          from_email: email.from,
          body: email.body.slice(0, 5000),
          received_at: new Date(email.date).toISOString(),
          ai_summary: parsed.summary,
        })
      }

      results.push({ email, parsed, jobId })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Email processing error:', error)
    return NextResponse.json({ error: 'Failed to process emails' }, { status: 500 })
  }
}