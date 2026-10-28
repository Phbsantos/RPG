import { useState, type ReactNode } from 'react'

// Campos reutilizáveis do editor de ficha.

export function Campo({ rotulo, dica, children, largo }: { rotulo: string; dica?: string; children: ReactNode; largo?: boolean }) {
  return (
    <label className={`ed-campo ${largo ? 'largo' : ''}`}>
      <span>{rotulo}</span>
      {children}
      {dica && <small className="suave">{dica}</small>}
    </label>
  )
}

type NumProps = {
  valor: number
  aoMudar: (n: number) => void
  min?: number
  max?: number
  decimal?: boolean
  rotulo?: string
  className?: string
}

/** Campo numérico que deixa apagar e digitar à vontade; só confirma números válidos, dentro dos limites. */
export function Num({ valor, aoMudar, min = -9999, max = 9999, decimal = false, rotulo, className }: NumProps) {
  const [texto, setTexto] = useState<string | null>(null) // null = não está sendo editado
  return (
    <input
      type="number"
      aria-label={rotulo}
      className={className}
      step={decimal ? 'any' : 1}
      value={texto ?? String(valor)}
      onFocus={() => setTexto(String(valor))}
      onBlur={() => setTexto(null)}
      onChange={(e) => {
        setTexto(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(n)) aoMudar(Math.min(max, Math.max(min, decimal ? n : Math.trunc(n))))
      }}
    />
  )
}

export function Txt({ valor, aoMudar, max = 80, placeholder, rotulo, lista }: { valor: string; aoMudar: (t: string) => void; max?: number; placeholder?: string; rotulo?: string; lista?: string }) {
  return <input value={valor} maxLength={max} placeholder={placeholder} aria-label={rotulo} list={lista} onChange={(e) => aoMudar(e.target.value)} />
}

export function Area({ valor, aoMudar, max = 2000, linhas = 3, placeholder, rotulo }: { valor: string; aoMudar: (t: string) => void; max?: number; linhas?: number; placeholder?: string; rotulo?: string }) {
  return <textarea value={valor} maxLength={max} rows={linhas} placeholder={placeholder} aria-label={rotulo} onChange={(e) => aoMudar(e.target.value)} />
}

/** Lista de textos curtos (idiomas, ferramentas, talentos…): digita e aperta Enter para adicionar. */
export function Etiquetas({ rotulo, itens, aoMudar, placeholder, max = 80 }: { rotulo: string; itens: string[]; aoMudar: (i: string[]) => void; placeholder?: string; max?: number }) {
  const [novo, setNovo] = useState('')
  const adicionar = () => {
    const t = novo.trim()
    if (t && !itens.includes(t)) aoMudar([...itens, t])
    setNovo('')
  }
  return (
    <div className="ed-etiquetas">
      <span className="ed-rotulo">{rotulo}</span>
      <div className="etiquetas">
        {itens.map((t) => (
          <button key={t} type="button" className="etiqueta" title="Remover" onClick={() => aoMudar(itens.filter((x) => x !== t))}>
            {t} ✕
          </button>
        ))}
      </div>
      <div className="acoes">
        <input
          value={novo}
          maxLength={max}
          placeholder={placeholder ?? 'Digite e aperte Enter'}
          aria-label={`Adicionar a ${rotulo}`}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionar()
            }
          }}
        />
        <button type="button" disabled={!novo.trim()} onClick={adicionar}>
          Adicionar
        </button>
      </div>
    </div>
  )
}

/** Lista de itens editáveis com botão de remover e de adicionar. */
export function Lista<T>({
  itens,
  aoMudar,
  novo,
  rotuloAdicionar,
  vazio,
  max = 100,
  render,
}: {
  itens: T[]
  aoMudar: (i: T[]) => void
  novo: () => T
  rotuloAdicionar: string
  vazio?: string
  max?: number
  render: (item: T, mudar: (parcial: Partial<T>) => void, indice: number) => ReactNode
}) {
  return (
    <div className="ed-lista">
      {itens.length === 0 && vazio && <p className="suave">{vazio}</p>}
      {itens.map((item, i) => (
        <div className="ed-item" key={i}>
          <div className="ed-item-campos">{render(item, (p) => aoMudar(itens.map((x, j) => (j === i ? { ...x, ...p } : x))), i)}</div>
          <button type="button" className="ed-remover" aria-label={`Remover item ${i + 1}`} title="Remover" onClick={() => aoMudar(itens.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" disabled={itens.length >= max} onClick={() => aoMudar([...itens, novo()])}>
        + {rotuloAdicionar}
      </button>
    </div>
  )
}
