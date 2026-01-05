import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl) {
            throw new Error('Ambiente inválido: SUPABASE_URL não encontrada.')
        }
        if (!supabaseServiceKey) {
            throw new Error('Ambiente inválido: SUPABASE_SERVICE_ROLE_KEY não encontrada. Verifique as configurações da função no painel do Supabase.')
        }

        const { name, email, password } = await req.json()

        if (!name || !email || !password) {
            throw new Error('Dados incompletos: nome, email e senha são obrigatórios.')
        }

        // Initialize Supabase Client with Service Role Key
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Create the user in Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name }
        })

        if (authError) {
            return new Response(JSON.stringify({ error: `Erro no Auth: ${authError.message}` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (!authData.user) {
            throw new Error('Erro ao criar usuário: Nenhuma informação retornada do Auth.')
        }

        // Create the profile entry
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                name: name,
                email: email,
                updated_at: new Date().toISOString()
            })

        if (profileError) {
            return new Response(JSON.stringify({ error: `Erro ao criar Perfil: ${profileError.message}` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ user: authData.user }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Erro interno no servidor' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
