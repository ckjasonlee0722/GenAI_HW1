import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { title } = await req.json();
  const { data, error } = await supabase
    .from('conversations')
    .insert({ title: title || '新對話' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { id, title } = await req.json();
  const { error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}