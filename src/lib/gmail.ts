import { google } from 'googleapis'

export function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

export async function fetchRecruiterEmails(accessToken: string) {
  const gmail = getGmailClient(accessToken)

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:(application OR interview OR offer OR rejection OR opportunity OR position OR role OR hiring OR recruiter OR candidate OR assessment OR "next steps" OR "following up")',
    maxResults: 5,
  })

  const messages = response.data.messages || []

  const emails = await Promise.all(
    messages.map(async (message) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      })

      const headers = detail.data.payload?.headers || []
      const subject = headers.find(h => h.name === 'Subject')?.value || ''
      const from = headers.find(h => h.name === 'From')?.value || ''
      const date = headers.find(h => h.name === 'Date')?.value || ''

      const body = extractBody(detail.data.payload)

      return {
        gmailId: message.id!,
        subject,
        from,
        date,
        body,
      }
    })
  )

  return emails
}

function extractBody(payload: any): string {
  if (!payload) return ''

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
    for (const part of payload.parts) {
      const result = extractBody(part)
      if (result) return result
    }
  }

  return ''
}

const JOB_KEYWORDS = [
  'application', 'interview', 'offer', 'position',
  'role', 'opportunity', 'hiring', 'recruiter',
  'candidate', 'resume', 'job', 'career', 'assessment',
  'technical', 'screen', 'onsite', 'rejection', 'unfortunately',
  'pleased to inform', 'next steps', 'follow up'
]

export function isLikelyJobEmail(subject: string, from: string): boolean {
  const text = `${subject} ${from}`.toLowerCase()
  return JOB_KEYWORDS.some(keyword => text.includes(keyword))
}