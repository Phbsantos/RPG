import type { Mapa, Token } from '../lib/mapa'

type Props = {
  token: Token
  aoMudarMapa: (atualizar: (m: Mapa) => Mapa) => void
  aoDesselecionar: () => void
}

// Controles do token selecionado (só o mestre), sobre o mapa.
export default function BarraToken({ token, aoMudarMapa, aoDesselecionar }: Props) {
  const mudar = (mudanca: Partial<Token>) =>
    aoMudarMapa((m) => ({ ...m, tokens: m.tokens.map((t) => (t.id === token.id ? { ...t, ...mudanca } : t)) }))

  return (
    <div className="barra-token">
      <strong>{token.nome}</strong>
      <button onClick={() => mudar({ oculto: !token.oculto })}>{token.oculto ? 'Revelar' : 'Ocultar'}</button>
      <select value={token.tamanho} onChange={(e) => mudar({ tamanho: Number(e.target.value) })} aria-label="Tamanho do token">
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            Tamanho {n}
          </option>
        ))}
      </select>
      <input type="color" value={token.cor} onChange={(e) => mudar({ cor: e.target.value })} aria-label="Cor do token" />
      <button
        onClick={() => {
          aoMudarMapa((m) => ({ ...m, tokens: m.tokens.filter((t) => t.id !== token.id) }))
          aoDesselecionar()
        }}
      >
        Remover
      </button>
    </div>
  )
}
