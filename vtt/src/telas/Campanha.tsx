import { useRef, useState } from 'react'
import { exportarCampanha, lerCampanha } from '../lib/campanha'
import { baixarJson } from '../ficha/arquivo'
import type { Combate } from '../lib/combate'
import type { Mapa } from '../lib/mapa'

type Props = {
  codigo: string
  combate: Combate
  mapa: Mapa
  aoImportar: (combate: Combate, mapa: Mapa) => void
}

export default function Campanha({ codigo, combate, mapa, aoImportar }: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  async function importar(arquivo: File | undefined) {
    if (!arquivo) return
    setMensagem('')
    const r = await lerCampanha(arquivo)
    if (entrada.current) entrada.current.value = ''
    if (!r.ok) return setErro(r.erro)
    setErro('')
    if (!window.confirm('Substituir o combate e o mapa atuais por este backup?')) return
    aoImportar(r.combate, r.mapa)
    setMensagem('Backup restaurado.')
  }

  return (
    <section className="cartao">
      <h3>Campanha (backup do mestre)</h3>
      <p className="suave">
        O combate e o mapa ficam só neste navegador. Exporte um backup para não perder nada se você trocar de
        computador ou limpar os dados do site.
      </p>
      <div className="acoes">
        <button onClick={() => baixarJson(`campanha-${codigo}.json`, exportarCampanha(combate, mapa))}>
          Exportar campanha (JSON)
        </button>
        <input
          ref={entrada}
          type="file"
          accept=".json,application/json"
          onChange={(e) => void importar(e.target.files?.[0])}
          aria-label="Importar backup"
        />
      </div>
      {mensagem && <p className="ok" role="status">{mensagem}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </section>
  )
}
