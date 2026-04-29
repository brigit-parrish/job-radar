import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase'
import { authOptions } from '../../../auth/[...nextauth]/route'

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emails } = await supabase
    .from('emails')
    .select('*')
    .eq('job_id', params.jobId)
    .order('received_at', { ascending: false })

  return NextResponse.json({ emails })
}