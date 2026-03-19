import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// POST /api/messages - 新增一則訊息
export async function POST(req: Request) {
  const { conversation_id, role, content } = await req.json();

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id, role, content })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}