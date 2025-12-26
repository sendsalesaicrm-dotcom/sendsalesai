import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone_number_id, access_token } = await req.json();

    if (!phone_number_id || !access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "ID do Telefone e Token de Acesso são obrigatórios." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Call Meta Graph API to verify the Phone Number ID and Token
    // We fetch the object to see if it exists and if we have permissions
    const metaUrl = `https://graph.facebook.com/v21.0/${phone_number_id}`;
    
    const response = await fetch(metaUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle Meta API errors
      const metaError = data.error?.message || "Erro desconhecido na API da Meta";
      return new Response(
        JSON.stringify({ success: false, error: metaError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 } // Returning 200 to client to handle the logical error gracefully
      );
    }

    // Double check if the ID returned matches the requested ID
    if (data.id !== phone_number_id) {
        return new Response(
            JSON.stringify({ success: false, error: "O ID retornado pela Meta não corresponde ao ID solicitado." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
    }

    // Success
    return new Response(
      JSON.stringify({ success: true, data: { id: data.id, name: data.display_phone_number || "Verificado" } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});