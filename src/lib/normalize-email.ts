export function normalizeEmailBody(body: string): string {
    return body
      .replace(/<[^>]*>/g, " ")
      .replace(/[A-Za-z0-9+/]{100,}={0,2}/g, "")
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/&[#a-zA-Z0-9]+;/g, " ")
      .replace(/â€[^\s]*/g, "")
      .replace(/\s{3,}/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\[image:[^\]]*\]/gi, "")
      .trim()
      .slice(0, 1500)
  }