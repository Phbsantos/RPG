import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && chave)

// Só cria o cliente quando as variáveis existem, para o app abrir mesmo sem elas.
export const supabase = supabaseConfigurado ? createClient(url!, chave!) : null
