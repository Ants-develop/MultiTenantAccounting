import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an AI assistant for an accounting and workflow management system. You help users understand their data and generate insights.

You have access to tools that can query:
- Clients: Business clients and their information
- Workflows/Jobs: Active jobs, pipelines, and their statuses
- Journal Entries: Financial transactions and accounting data

When users ask questions:
1. Use the appropriate tool to fetch data
2. Analyze the results carefully
3. Provide clear, concise answers
4. Format financial data properly (currency, dates)
5. Suggest next steps or related insights when relevant

Be professional, accurate, and helpful. If you don't have enough information, ask clarifying questions.`;

const tools = [
  {
    type: "function",
    function: {
      name: "query_clients",
      description: "Query client information including name, status, business type, and assigned team members",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "inactive", "archived"],
            description: "Filter clients by status"
          },
          search: {
            type: "string",
            description: "Search clients by name"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default 10)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_workflows",
      description: "Query workflows/jobs including their status, client, assigned person, and current stage",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Filter by workflow status (e.g., 'in_progress', 'completed')"
          },
          client_id: {
            type: "string",
            description: "Filter by specific client ID"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default 10)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_journal_entries",
      description: "Query journal entries for financial analysis including amounts, accounts, dates, and clients",
      parameters: {
        type: "object",
        properties: {
          client_id: {
            type: "string",
            description: "Filter by specific client ID"
          },
          start_date: {
            type: "string",
            description: "Start date filter (YYYY-MM-DD)"
          },
          end_date: {
            type: "string",
            description: "End date filter (YYYY-MM-DD)"
          },
          status: {
            type: "string",
            enum: ["draft", "posted", "void"],
            description: "Filter by entry status"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default 20)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_financial_summary",
      description: "Generate a summary of financial data for a specific period or client",
      parameters: {
        type: "object",
        properties: {
          client_id: {
            type: "string",
            description: "Specific client ID (optional)"
          },
          start_date: {
            type: "string",
            description: "Start date (YYYY-MM-DD)"
          },
          end_date: {
            type: "string",
            description: "End date (YYYY-MM-DD)"
          }
        },
        required: ["start_date", "end_date"]
      }
    }
  }
];

async function executeToolCall(toolName: string, args: any, supabase: any) {
  console.log(`Executing tool: ${toolName}`, args);
  
  try {
    switch (toolName) {
      case "query_clients": {
        let query = supabase
          .from('clients')
          .select('id, name, status, business_type, email, phone, industry, assigned_owner_id, assigned_accountant_id')
          .order('name');
        
        if (args.status) query = query.eq('status', args.status);
        if (args.search) query = query.ilike('name', `%${args.search}%`);
        
        const { data, error } = await query.limit(args.limit || 10);
        if (error) throw error;
        
        return { success: true, data, count: data.length };
      }
      
      case "query_workflows": {
        let query = supabase
          .from('workflows')
          .select(`
            id, name, status, period, due_date, created_at,
            clients(id, name),
            workflow_stages(name),
            assigned_to_user:profiles!workflows_assigned_to_fkey(full_name)
          `)
          .order('created_at', { ascending: false });
        
        if (args.status) query = query.eq('status', args.status);
        if (args.client_id) query = query.eq('client_id', args.client_id);
        
        const { data, error } = await query.limit(args.limit || 10);
        if (error) throw error;
        
        return { success: true, data, count: data.length };
      }
      
      case "query_journal_entries": {
        let query = supabase
          .from('journal_entries')
          .select(`
            id, entry_date, description, amount, currency, status,
            debit_account, credit_account, party_name, reference_number,
            client:clients(id, name)
          `)
          .order('entry_date', { ascending: false });
        
        if (args.client_id) query = query.eq('client_id', args.client_id);
        if (args.start_date) query = query.gte('entry_date', args.start_date);
        if (args.end_date) query = query.lte('entry_date', args.end_date);
        if (args.status) query = query.eq('status', args.status);
        
        const { data, error } = await query.limit(args.limit || 20);
        if (error) throw error;
        
        return { success: true, data, count: data.length };
      }
      
      case "generate_financial_summary": {
        let query = supabase
          .from('journal_entries')
          .select('amount, currency, status, entry_date, client:clients(id, name)')
          .gte('entry_date', args.start_date)
          .lte('entry_date', args.end_date)
          .eq('status', 'posted');
        
        if (args.client_id) query = query.eq('client_id', args.client_id);
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Calculate summary
        const totalAmount = data.reduce((sum: number, entry: any) => sum + parseFloat(entry.amount), 0);
        const entryCount = data.length;
        const clientsCount = new Set(data.map((e: any) => e.client?.id)).size;
        
        return {
          success: true,
          summary: {
            period: `${args.start_date} to ${args.end_date}`,
            total_amount: totalAmount,
            entry_count: entryCount,
            clients_count: clientsCount,
            currency: data[0]?.currency || 'USD'
          }
        };
      }
      
      default:
        return { success: false, error: "Unknown tool" };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    // Get auth token and create authenticated Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // First call to AI with tools
    let aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        tools,
        stream: false, // First call non-streaming to check for tool calls
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiResponse = await response.json();
    const firstChoice = aiResponse.choices[0];

    // Check if AI wants to use tools
    if (firstChoice.message.tool_calls) {
      console.log('AI requested tool calls:', firstChoice.message.tool_calls.length);
      
      // Execute all tool calls
      const toolResults = await Promise.all(
        firstChoice.message.tool_calls.map(async (toolCall: any) => {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeToolCall(toolCall.function.name, args, supabase);
          
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify(result)
          };
        })
      );

      // Add assistant message with tool calls and tool results
      aiMessages.push(firstChoice.message);
      aiMessages.push(...toolResults);

      // Make second call with tool results - NOW STREAMING
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: aiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('AI gateway error on second call');
      }

      // Stream the response
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // No tool calls - make streaming call directly
    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error('AI gateway error');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
