import { useEffect, useState } from 'react'
import { supabaseConfigurado } from './lib/supabase'
import { normalizarCodigo, TAMANHO_CODIGO } from './lib/sala'
import { papelNaSala } from './lib/identidade'
import { fixarChave } from './lib/seguranca'
import Inicio from './telas/Inicio'
import Sala from './telas/Sala'
import './App.css'

// Rota por hash (#/sala/ABC123): funciona na Vercel sem configurar reescrita de URL.
// O link de convite do mestre traz a chave pública dele (?k=...): é ela que autentica o mestre.
function codigoDaUrl(): string | null {
  const m = location.hash.match(/^#\/sala\/([A-Za-z0-9]+)(?:\?k=([A-Za-z0-9_-]{40,100}))?/)
  const codigo = m ? normalizarCodigo(m[1]) : ''
  if (codigo.length !== TAMANHO_CODIGO) return null
  if (m?.[2] && papelNaSala(codigo) === 'jogador') fixarChave(codigo, m[2])
  return codigo
}

export default function App() {
  const [codigo, setCodigo] = useState<string | null>(codigoDaUrl)

  useEffect(() => {
    const aoMudar = () => setCodigo(codigoDaUrl())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  if (!supabaseConfigurado) {
    return (
      <main className="inicio">
        <h1>Mesa Virtual de D&amp;D</h1>
        <p className="aviso">
          Supabase não configurado: crie o arquivo .env com base no .env.example.
        </p>
      </main>
    )
  }

  if (codigo) {
    return <Sala key={codigo} codigo={codigo} sair={() => (location.hash = '')} />
  }
  return <Inicio irParaSala={(c) => (location.hash = `#/sala/${c}`)} />
}
