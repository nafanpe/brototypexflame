import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();
    
    if (!description || description.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Description too short' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Lovable AI API Key (auto-provisioned)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.3,
        messages: [
          { 
            role: 'system', 
            content: `You are a background text-processing engine for a facility management app. Your ONLY job is to rewrite raw input into professional, corporate complaint text.

STRICT RULES:
1. NEVER ask questions.
2. NEVER ask for more details.
3. NEVER converse with the user.
4. If the input is vague (e.g., just "wifi" or "cycle"), assume the user is reporting a malfunction with that specific asset and write a formal statement requesting maintenance for it.
5. Output ONLY the polished text. Do not add intro/outro filler like "Here is your polished text".` 
          },
          { role: 'user', content: description }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI Gateway request failed');
    }

    const data = await response.json();
    const polishedText = data.choices?.[0]?.message?.content;

    if (!polishedText) {
      throw new Error('No response from AI');
    }

    return new Response(
      JSON.stringify({ polishedText }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in polish-complaint function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
