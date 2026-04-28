import Anthropic from "@anthropic-ai/sdk"
import { normalizeEmailBody } from "./normalize-email"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface ParsedEmail {
  isJobRelated: boolean
  company?: string
  role?: string
  status?: "applied" | "rejected" | "technical" | "interview" | "offer"
  summary?: string
  suggestedReply?: string
}

export async function parseEmail(
  subject: string,
  from: string,
  body: string
): Promise<ParsedEmail> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a job search assistant. Analyze this email and determine if it is related to a job application.

Email Subject: ${subject}
From: ${from}
Body: ${normalizeEmailBody(body)}

Respond ONLY with a JSON object in this exact format, no other text:
{
  "isJobRelated": true or false,
  "company": "company name or null",
  "role": "job title or null",
  "status": "applied|rejected|technical|interview|offer or null",
  "summary": "one sentence summary or null",
  "suggestedReply": "a professional reply email draft if a response is needed, or null"
}

Status rules:
- "applied" = confirmation that application was received
- "technical" = technical screen or assessment scheduled/requested
- "interview" = interview scheduled or requested
- "offer" = job offer received
- "rejected" = rejection or no longer being considered

Only set suggestedReply if the email warrants a response. Not for rejections or confirmations.`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  try {
    const cleaned = text.replace(/```json|```/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return { isJobRelated: false }
  }
}