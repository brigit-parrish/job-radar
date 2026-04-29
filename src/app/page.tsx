"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

interface Job {
  id: string;
  company: string;
  role: string;
  status: "applied" | "technical" | "interview" | "offer" | "rejected";
  applied_date: string;
  last_updated: string;
}

interface EmailRecord {
  id: string;
  subject: string;
  from_email: string;
  ai_summary: string;
  suggested_reply?: string;
  received_at: string;
}

const STATUS_COLUMNS = [
  { key: "applied", label: "Applied", color: "#4ade80" },
  { key: "technical", label: "Technical", color: "#4ade80" },
  { key: "interview", label: "Interview", color: "#4ade80" },
  { key: "offer", label: "Offer", color: "#4ade80" },
  { key: "rejected", label: "Rejected", color: "#4ade80" },
] as const;

const CALENDAR_STATUSES = ["technical", "interview"];

export default function Home() {
  const { data: session, status } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobEmails, setJobEmails] = useState<Record<string, EmailRecord[]>>({});
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    if (session) fetchJobs();
  }, [session]);

  async function fetchJobs() {
    if (!selectedJob) setLoading(true)
    const res = await fetch("/api/jobs")
    const data = await res.json()
    setJobs(data.jobs || [])
    if (!selectedJob) setLoading(false)
  }

  async function fetchJobEmails(jobId: string) {
    if (jobEmails[jobId]) return;
    const res = await fetch(`/api/jobs/${jobId}/emails`);
    const data = await res.json();
    setJobEmails(prev => ({ ...prev, [jobId]: data.emails || [] }));
  }

  async function syncEmails() {
    setSyncing(true)
    fetch("/api/emails")
    
    let count = 0
    const interval = setInterval(async () => {
      count++
      await fetchJobs()
      if (count >= 12) { 
        clearInterval(interval)
        setSyncing(false)
      }
    }, 5000)
  }

  function openJob(job: Job) {
    setSelectedJob(job);
    setShowSummary(false);
    setShowReply(false);
    fetchJobEmails(job.id);
  }

  function closeDrawer() {
    setSelectedJob(null);
    setShowSummary(false);
    setShowReply(false);
  }

  async function addToCalendar(job: Job) {
    setAddingToCalendar(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, company: job.company, role: job.role }),
      });
      const data = await res.json();
      if (data.success) alert("Added to Google Calendar!");
    } catch {
      alert("Failed to add to calendar");
    }
    setAddingToCalendar(false);
  }

  const emails = selectedJob ? (jobEmails[selectedJob.id] || []) : [];
  const latestEmail = emails[0];

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1d" }}>
        <p style={{ color: "#666" }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", background: "#1a1a1d" }}>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "3rem", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>
          Job Radar
        </h1>
        <p style={{ color: "#666", margin: 0 }}>AI-powered job application tracker</p>
        <button
          onClick={() => signIn("google")}
          style={{ padding: "12px 32px", borderRadius: "8px", fontWeight: 600, background: "#4ade80", color: "#000", cursor: "pointer", border: "none", fontSize: "0.9rem" }}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a1d", position: "relative" }}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 32px", background: "#222226", borderBottom: "1px solid #2e2e33" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: "1.75rem", fontWeight: 700, color: "#f0f0f0", margin: 0 }}>
            Job Radar
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80" }} />
            <p style={{ color: "#888", fontSize: "0.8rem", margin: 0 }}>{session.user?.email}</p>
          </div>
        </div>
        <button
          onClick={syncEmails}
          disabled={syncing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 600,
            background: syncing ? "#2a2a2d" : "#4ade80",
            color: syncing ? "#888" : "#000",
            border: "none",
            cursor: syncing ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? "Syncing..." : "Sync Emails"}
        </button>
      </div>

      {/* KANBAN BOARD */}
      <div style={{ display: "flex", gap: "16px", padding: "32px", overflowX: "auto" }}>
        {STATUS_COLUMNS.map((col) => {
          const colJobs = jobs.filter(j => j.status === col.key);
          return (
            <div
              key={col.key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                minWidth: "280px",
                width: "280px",
                flexShrink: 0,
                background: "#222226",
                borderRadius: "16px",
                padding: "20px",
              }}
            >
              {/* COLUMN HEADER */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "#f0f0f0" }}>
                  {col.label}
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 10px", borderRadius: "999px", background: "#4ade80", color: "#000" }}>
                  {colJobs.length}
                </span>
              </div>

              {/* JOB CARDS */}
              {loading ? (
                <div style={{ height: "96px", borderRadius: "12px", background: "#2a2a2d" }} />
              ) : colJobs.length === 0 ? (
                <div style={{ height: "80px", borderRadius: "12px", border: "2px dashed #2e2e33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: "0.75rem", color: "#555", margin: 0 }}>No jobs</p>
                </div>
              ) : (
                colJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => openJob(job)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "#f5f0e8",
                      border: "none",
                      cursor: "pointer",
                      borderLeft: "4px solid #4ade80",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "#2e7d32", flexShrink: 0 }}>
                        {job.company[0]}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111", margin: 0 }}>{job.company}</p>
                        <p style={{ fontSize: "0.75rem", color: "#666", margin: "2px 0 0 0" }}>{job.role}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "0.7rem", color: "#888" }}>📅</span>
                      <p style={{ fontSize: "0.7rem", color: "#888", margin: 0 }}>
                        {new Date(job.applied_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* SLIDE DRAWER OVERLAY */}
      {selectedJob && (
        <>
          {/* backdrop */}
          <div
            onClick={closeDrawer}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
          />

          {/* drawer */}
          <div style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            width: "420px",
            background: "#222226",
            borderLeft: "1px solid #2e2e33",
            zIndex: 50,
            overflowY: "auto",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}>

            {/* DRAWER HEADER */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 700, color: "#2e7d32" }}>
                  {selectedJob.company[0]}
                </div>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: "1.2rem", color: "#f0f0f0", margin: 0 }}>{selectedJob.company}</h2>
                  <p style={{ fontSize: "0.85rem", color: "#888", margin: "2px 0 0 0" }}>{selectedJob.role}</p>
                </div>
              </div>
              <button onClick={closeDrawer} style={{ background: "none", border: "none", color: "#888", fontSize: "1.2rem", cursor: "pointer", padding: "4px" }}>✕</button>
            </div>

            {/* META INFO */}
            <div style={{ background: "#2a2a2d", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem" }}>📅</span>
                <p style={{ fontSize: "0.8rem", color: "#ccc", margin: 0 }}>
                  Applied on {new Date(selectedJob.applied_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              {latestEmail && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.8rem" }}>✉️</span>
                  <p style={{ fontSize: "0.8rem", color: "#ccc", margin: 0 }}>{latestEmail.from_email}</p>
                </div>
              )}
            </div>

            {/* STATUS BADGE */}
            <div style={{ display: "inline-flex" }}>
              <span style={{ padding: "4px 12px", borderRadius: "999px", background: "#4ade8020", color: "#4ade80", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {selectedJob.status}
              </span>
            </div>

            {/* AI SUMMARY */}
            <button
              onClick={() => setShowSummary(!showSummary)}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#2a2a2d", border: "1px solid #3a3a3e", color: "#f0f0f0", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <span>✦</span> AI Summary
            </button>

            {showSummary && latestEmail?.ai_summary && (
              <div style={{ background: "#2a2a2d", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontSize: "0.8rem", color: "#ccc", lineHeight: 1.7, margin: 0 }}>{latestEmail.ai_summary}</p>
              </div>
            )}

            {/* SUGGESTED REPLY */}
            {latestEmail?.suggested_reply && (
              <>
                <button
                  onClick={() => setShowReply(!showReply)}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#2a2a2d", border: "1px solid #3a3a3e", color: "#f0f0f0", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  <span>✉</span> Suggested Reply
                </button>
                {showReply && (
                  <div style={{ background: "#2a2a2d", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    
                    {/* TO FIELD */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>To</label>
                      <input
                        id="reply-to"
                        defaultValue={latestEmail.from_email}
                        style={{
                          background: "#1a1a1d",
                          color: "#ccc",
                          border: "1px solid #3a3a3e",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "0.8rem",
                          fontFamily: "inherit",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* SUBJECT FIELD */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>Subject</label>
                      <input
                        id="reply-subject"
                        defaultValue={`Re: ${latestEmail.subject}`}
                        style={{
                          background: "#1a1a1d",
                          color: "#ccc",
                          border: "1px solid #3a3a3e",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "0.8rem",
                          fontFamily: "inherit",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* FROM FIELD - read only */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>From</label>
                      <input
                        value={session.user?.email || ''}
                        readOnly
                        style={{
                          background: "#111",
                          color: "#555",
                          border: "1px solid #2a2a2d",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "0.8rem",
                          fontFamily: "inherit",
                          width: "100%",
                          boxSizing: "border-box",
                          cursor: "not-allowed",
                        }}
                      />
                    </div>

                    {/* DIVIDER */}
                    <div style={{ borderTop: "1px solid #3a3a3e" }} />

                    {/* BODY */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>Message</label>
                      <textarea
                        id="reply-body"
                        defaultValue={latestEmail.suggested_reply}
                        rows={10}
                        style={{
                          width: "100%",
                          background: "#1a1a1d",
                          color: "#ccc",
                          border: "1px solid #3a3a3e",
                          borderRadius: "8px",
                          padding: "12px",
                          fontSize: "0.8rem",
                          lineHeight: 1.7,
                          resize: "vertical",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* SEND BUTTON */}
                    <button
                      onClick={async () => {
                        if (!latestEmail) return
                        const to = (document.getElementById('reply-to') as HTMLInputElement).value
                        const subject = (document.getElementById('reply-subject') as HTMLInputElement).value
                        const body = (document.getElementById('reply-body') as HTMLTextAreaElement).value

                        const res = await fetch('/api/reply', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ to, subject, body }),
                        })
                        const data = await res.json()
                        if (data.success) {
                          alert('Reply sent!')
                          setShowReply(false)
                        } else {
                          alert('Failed to send reply')
                        }
                      }}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#4ade80", color: "#000", border: "none", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Send Reply
                    </button>
                  </div>
                )}
                

              </>
            )}

            {/* ADD TO CALENDAR */}
            {CALENDAR_STATUSES.includes(selectedJob.status) && (
              <button
                onClick={() => addToCalendar(selectedJob)}
                disabled={addingToCalendar}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: addingToCalendar ? "#2a2a2d" : "#4ade80",
                  color: addingToCalendar ? "#888" : "#000",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: addingToCalendar ? "not-allowed" : "pointer",
                }}
              >
                {addingToCalendar ? "Adding..." : "+ Add to Calendar"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}