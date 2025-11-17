import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const complaintSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(80, 'Title too long'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(1500, 'Description too long'),
  category: z.enum(['facilities', 'technical', 'academic', 'food', 'transport', 'other']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  location: z.string().trim().max(50, 'Location too long').optional().nullable(),
  is_anonymous: z.boolean().default(false),
  admin_only: z.boolean().default(false),
});

const commentSchema = z.object({
  complaint_id: z.string().uuid('Invalid complaint ID'),
  comment: z.string().trim().min(1, 'Comment cannot be empty').max(800, 'Comment must be less than 800 characters'),
  is_internal: z.boolean().default(false),
});

const statusUpdateSchema = z.object({
  complaint_id: z.string().uuid('Invalid complaint ID'),
  status: z.enum(['submitted', 'in_review', 'in_progress', 'resolved', 'closed']),
  resolution_notes: z.string().trim().max(800, 'Resolution notes must be less than 800 characters').optional().nullable(),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = await req.json();

    console.log(`[submit-complaint] Action: ${action}, User: ${user.id}`);

    // Route to appropriate handler
    switch (action) {
      case 'create':
        return await handleCreateComplaint(supabaseClient, user.id, body);
      case 'comment':
        return await handleAddComment(supabaseClient, user.id, body);
      case 'update-status':
        return await handleUpdateStatus(supabaseClient, user.id, body);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[submit-complaint] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreateComplaint(supabaseClient: any, userId: string, body: any) {
  // Validate input
  const validationResult = complaintSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const validated = validationResult.data;

  // Check rate limit (max 10 complaints per day)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentComplaints, error: countError } = await supabaseClient
    .from('complaints')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo);

  if (countError) {
    console.error('[submit-complaint] Rate limit check error:', countError);
    return new Response(
      JSON.stringify({ error: 'Failed to check rate limit' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get max_complaints_per_day setting
  const { data: settings } = await supabaseClient
    .from('settings')
    .select('value')
    .eq('key', 'max_complaints_per_day')
    .single();

  const maxPerDay = settings?.value || 10;
  
  if (recentComplaints && recentComplaints.length >= maxPerDay) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded', 
        message: `You can only submit ${maxPerDay} complaints per day. Please try again later.` 
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Insert complaint
  const { data: complaint, error: insertError } = await supabaseClient
    .from('complaints')
    .insert({
      user_id: userId,
      title: validated.title,
      description: validated.description,
      category: validated.category,
      urgency: validated.urgency,
      location: validated.location || null,
      is_anonymous: validated.is_anonymous,
      admin_only: validated.admin_only,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[submit-complaint] Insert error:', insertError);
    return new Response(
      JSON.stringify({ error: 'Failed to create complaint', details: insertError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[submit-complaint] Created complaint ${complaint.id}`);

  return new Response(
    JSON.stringify({ success: true, complaint }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAddComment(supabaseClient: any, userId: string, body: any) {
  // Validate input
  const validationResult = commentSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const validated = validationResult.data;

  // Rate limit: max 20 comments per minute
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { count, error: countError } = await supabaseClient
    .from('complaint_comments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo);

  if (countError) {
    console.error('[submit-complaint] Comment rate limit check error:', countError);
  } else if (count && count >= 20) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded', 
        message: 'You are commenting too quickly. Please wait a moment.' 
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Insert comment
  const { data: comment, error: insertError } = await supabaseClient
    .from('complaint_comments')
    .insert({
      complaint_id: validated.complaint_id,
      user_id: userId,
      comment: validated.comment,
      is_internal: validated.is_internal,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[submit-complaint] Comment insert error:', insertError);
    return new Response(
      JSON.stringify({ error: 'Failed to add comment', details: insertError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[submit-complaint] Added comment to complaint ${validated.complaint_id}`);

  return new Response(
    JSON.stringify({ success: true, comment }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdateStatus(supabaseClient: any, userId: string, body: any) {
  // Validate input
  const validationResult = statusUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const validated = validationResult.data;

  // Check if user is admin
  const { data: hasAdminRole } = await supabaseClient
    .rpc('has_role', { _user_id: userId, _role: 'admin' });

  if (!hasAdminRole) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update complaint status
  const updateData: any = {
    status: validated.status,
  };

  if (validated.resolution_notes) {
    updateData.resolution_notes = validated.resolution_notes;
  }

  const { data: complaint, error: updateError } = await supabaseClient
    .from('complaints')
    .update(updateData)
    .eq('id', validated.complaint_id)
    .select()
    .single();

  if (updateError) {
    console.error('[submit-complaint] Status update error:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to update status', details: updateError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[submit-complaint] Updated complaint ${validated.complaint_id} status to ${validated.status}`);

  return new Response(
    JSON.stringify({ success: true, complaint }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
