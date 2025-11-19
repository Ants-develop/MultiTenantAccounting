import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  clientId: string;
  clientName: string;
  clientEmail: string;
  senderName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, clientName, clientEmail, senderName }: InvitationRequest = await req.json();

    console.log("Sending portal invitation to:", clientEmail, "for client:", clientName);

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the portal access token and update invitation timestamp
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("portal_access_token")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Error fetching client:", clientError);
      throw new Error("Client not found");
    }

    // Update invitation sent timestamp
    const { error: updateError } = await supabase
      .from("clients")
      .update({ 
        portal_invitation_sent_at: new Date().toISOString(),
        portal_enabled: true
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Error updating client:", updateError);
      throw new Error("Failed to update client");
    }

    const portalSetupUrl = `${Deno.env.get("SUPABASE_URL")?.replace("https://rzfzopqzemibiszlypjs.supabase.co", "https://aef1afcb-6260-46bd-9cce-a107cf78ead0.lovableproject.com")}/portal/setup/${client.portal_access_token}`;

    // Send email using Resend API directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Portal Invitation <noreply@ants.ge>",
        to: [clientEmail],
        subject: `You've been invited to access your client portal`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 30px;
                  border-radius: 10px 10px 0 0;
                  text-align: center;
                }
                .content {
                  background: #f9fafb;
                  padding: 40px 30px;
                  border-radius: 0 0 10px 10px;
                }
                .button {
                  display: inline-block;
                  background: #667eea;
                  color: white;
                  padding: 14px 32px;
                  text-decoration: none;
                  border-radius: 8px;
                  margin: 20px 0;
                  font-weight: 600;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  color: #6b7280;
                  font-size: 14px;
                }
                .info-box {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                  border-left: 4px solid #667eea;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Welcome to Your Client Portal</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; margin-bottom: 20px;">Hi ${clientName},</p>
                
                <p>${senderName} has invited you to access your secure client portal. With your portal account, you can:</p>
                
                <div class="info-box">
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>View and upload documents securely</li>
                    <li>Track your tasks and deadlines</li>
                    <li>Communicate with your account team</li>
                    <li>View billing and payment information</li>
                    <li>Access your account 24/7</li>
                  </ul>
                </div>
                
                <p style="margin-top: 30px; margin-bottom: 10px;">Click the button below to set up your account:</p>
                
                <div style="text-align: center;">
                  <a href="${portalSetupUrl}" class="button">Set Up My Account</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${portalSetupUrl}" style="color: #667eea; word-break: break-all;">${portalSetupUrl}</a>
                </p>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                  <strong>Note:</strong> This invitation link will expire in 7 days for security purposes.
                </p>
              </div>
              
              <div class="footer">
                <p>If you didn't expect this invitation, please disregard this email.</p>
                <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Portal invitation sent successfully",
        emailId: emailData.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-portal-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send invitation" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
