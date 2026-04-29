import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user?.email || ''

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .order('last_updated', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ jobs })
}