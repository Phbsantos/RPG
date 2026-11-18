import { useEffect, useState } from 'react'
import { aplicarModoD20, criticoDe, formulaTeste, totalDe, type ModoD20, type Registro, type Termo } from '../lib/dados'

type Props = {
  rolagens: Registro[]
  modo: ModoD20
  aoMudarModo: (m: ModoD20) => void
  ehMestre: boolean
  erro: string
  aoRolar: (formula: string, secreta: boolean) => void
}

const DADOS_RAPIDOS = [4, 6, 8, 10, 12, 20, 100]

export default function PainelDados({ rolagens, modo, aoMudarModo, ehMestre, erro, aoRolar }: Props) {
  const [formula, setFormula] = useState('1d20')
  const [secreta, setSecreta] = useState(false)
  // Rolagens que já estavam no histórico ao abrir o painel não animam; só as que chegam depois.
  const [jaExistiam] = useState(() => new Set(rolagens.map((r) => r.id)))

  // Trocar o modo já reescreve o d20 da fórmula do campo (1d20 ⇄ 2d20kh1 / 2d20kl1).
  function mudarModo(novo: ModoD20) {
    aoMudarModo(novo)
    setFormula((f) => aplicarModoD20(f, novo))
  }

  return (
    <section className="dados">
      <h3 className="painel-titulo">Dados</h3>

      <div className="dados-rapidos">
        {DADOS_RAPIDOS.map((l) => (
          <button key={l} className={l === 20 ? 'd20' : ''} onClick={() => aoRolar(l === 20 ? formulaTeste(0, modo) : `1d${l}`, secreta && ehMestre)}>
            d{l}
          </button>
        ))}
      </div>

      <form
        className="acoes"
        onSubmit={(e) => {
          e.preventDefault()
          const final = aplicarModoD20(formula, modo)
          setFormula(final)
          aoRolar(final, secreta && ehMestre)
        }}
      >
        <input style={{ flex: 1, minWidth: 0 }} value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="2d6+3" aria-label="Fórmula" />
        <button type="submit">Rolar</button>
      </form>

      <div className="acoes" style={{ marginTop: 8 }}>
        {/* Clicar no botão ligado volta ao modo normal. */}
        <div className="modo-d20" role="group" aria-label="Modo do d20">
          {(['vantagem', 'desvantagem'] as const).map((m) => (
            <button key={m} className={`${m} ${modo === m ? 'ligado' : ''}`} aria-pressed={modo === m} onClick={() => mudarModo(modo === m ? 'normal' : m)}>
              {m === 'vantagem' ? 'Vantagem' : 'Desvantagem'}
            </button>
          ))}
        </div>
        {ehMestre && (
          <label>
            <input type="checkbox" checked={secreta} onChange={(e) => setSecreta(e.target.checked)} /> Secreta (só eu vejo)
          </label>
        )}
      </div>

      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 6 }}>
          {erro}
        </p>
      )}

      <h3 className="painel-titulo" style={{ marginTop: 14, marginBottom: 0 }}>Histórico</h3>
      <ul className="historico">
        {rolagens.map((r) => (
          <LinhaRolagem key={r.id} r={r} animar={!jaExistiam.has(r.id)} />
        ))}
        {rolagens.length === 0 && <li className="suave">Nenhuma rolagem ainda.</li>}
      </ul>
    </section>
  )
}

const DURACAO_GIRO = 650 // ms que os números "giram" antes de mostrar o resultado
const reduzirMovimento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Só enfeite: o resultado já está decidido em `r`; durante o giro mostramos números aleatórios no lugar dos dados.
function LinhaRolagem({ r, animar }: { r: Registro; animar: boolean }) {
  const critico = criticoDe(r.termos)
  const [girando, setGirando] = useState(() => animar && !reduzirMovimento())
  const [quadro, setQuadro] = useState(0)

  useEffect(() => {
    if (!girando) return
    const troca = setInterval(() => setQuadro((q) => q + 1), 70)
    const fim = setTimeout(() => setGirando(false), DURACAO_GIRO)
    return () => {
      clearInterval(troca)
      clearTimeout(fim)
    }
  }, [girando])

  const classe = girando ? 'girando' : [animar ? 'revelada' : '', critico === 'max' ? 'critico' : critico === 'min' ? 'falha' : ''].join(' ').trim()
  return (
    <li className={classe}>
      <strong>{r.autor}</strong>
      {r.secreta && <span className="selo"> secreta</span>}
      {r.rotulo && <> — {r.rotulo}</>} <span className="suave">{r.formula}</span>
      <div>
        {r.termos.map((t, i) => (
          <TermoVista key={i} t={t} primeiro={i === 0} giro={girando ? quadro + i * 3 : null} />
        ))}{' '}
        = <strong className="total">{girando ? '…' : totalDe(r.termos)}</strong>
      </div>
    </li>
  )
}

// Durante o giro (`giro` = número do quadro) mostra faces falsas, calculadas a partir do quadro para a renderização ser pura.
function TermoVista({ t, primeiro, giro }: { t: Termo; primeiro: boolean; giro: number | null }) {
  const sinal = t.sinal === -1 ? ' − ' : primeiro ? '' : ' + '
  if (t.tipo === 'fixo') return <span>{sinal}{t.valor}</span>
  return (
    <span>
      {sinal}[
      {t.valores.map((v, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {giro !== null ? 1 + (((giro * 7 + i * 5 + t.lados) * 2654435761) >>> 0) % t.lados : t.mantidos[i] ? v : <s className="suave">{v}</s>}
        </span>
      ))}
      ]
    </span>
  )
}
