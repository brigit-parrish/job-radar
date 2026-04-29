import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { getSupabaseWithAuth } from '@/src/lib/supabase-server'
import { authOptions } from '../../../auth/[...nextauth]/route'

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const supabase = getSupabaseWithAuth(session.user?.email || '') 
  const { data: emails } = await supabase
    .from('emails')
    .select('*')
    .eq('job_id', params.jobId)
    .order('received_at', { ascending: false })

  return NextResponse.json({ emails })
}