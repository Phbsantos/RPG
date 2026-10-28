import { useEffect, useMemo, useState } from 'react'
import {
  carregarBestiario,
  formatarND,
  traduzirTamanho,
  traduzirTipo,
  type EdicaoBestiario,
  type Monstro,
} from '../lib/bestiario'

type Props = { aoEscolher: (m: Monstro) => void }

const MAX_LINHAS = 40

export default function Bestiario({ aoEscolher }: Props) {
  const [edicao, setEdicao] = useState<EdicaoBestiario>('2024')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [ndMax, setNdMax] = useState('')
  const [carregado, setCarregado] = useState<{ edicao: EdicaoBestiario; lista: Monstro[] } | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let atual = true
    carregarBestiario(edicao)
      .then((lista) => {
        if (!atual) return
        setErro('')
        setCarregado({ edicao, lista })
      })
      .catch((e: Error) => atual && setErro(e.message))
    return () => {
      atual = false
    }
  }, [edicao])

  const lista = useMemo(() => (carregado?.edicao === edicao ? carregado.lista : []), [carregado, edicao])
  const tipos = useMemo(() => [...new Set(lista.map((m) => m.t))].sort(), [lista])
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return lista.filter(
      (m) =>
        (!termo || m.n.toLowerCase().includes(termo)) &&
        (!tipo || m.t === tipo) &&
        (ndMax === '' || m.nd <= Number(ndMax)),
    )
  }, [lista, busca, tipo, ndMax])

  return (
    <div className="bestiario">
      <div className="form-npc">
        <label>
          Edição
          <select value={edicao} onChange={(e) => setEdicao(e.target.value as EdicaoBestiario)}>
            <option value="2024">D&amp;D 2024 (SRD 5.2)</option>
            <option value="2014">D&amp;D 2014 (SRD 5.1)</option>
          </select>
        </label>
        <label>
          Buscar (nome em inglês)
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="goblin, dragon…" />
        </label>
        <label>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {traduzirTipo(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          ND até
          <select value={ndMax} onChange={(e) => setNdMax(e.target.value)}>
            <option value="">Qualquer</option>
            {[0.25, 1, 2, 3, 5, 8, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {formatarND(n)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!erro && lista.length === 0 && <p className="aviso">Carregando…</p>}

      {lista.length > 0 && (
        <>
          <p className="suave">
            {filtrados.length} de {lista.length} criaturas
            {filtrados.length > MAX_LINHAS && ` (mostrando as ${MAX_LINHAS} primeiras; refine a busca)`}
          </p>
          <ul className="lista-monstros">
            {filtrados.slice(0, MAX_LINHAS).map((m) => (
              <li key={m.n}>
                <span className="nome">
                  {m.n} <span className="suave">{traduzirTamanho(m.s)} {traduzirTipo(m.t).toLowerCase()}</span>
                </span>
                <span>ND {formatarND(m.nd)}</span>
                <span>CA {m.ca}</span>
                <span>PV {m.pv}</span>
                <span>Ini {m.i >= 0 ? `+${m.i}` : m.i}</span>
                <button onClick={() => aoEscolher(m)}>Usar</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="suave creditos">
        Este trabalho inclui material do System Reference Document 5.1 / 5.2 da Wizards of the Coast LLC,
        licenciado sob{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noreferrer">
          Creative Commons Attribution 4.0
        </a>
        . Dados obtidos via Open5e. Os nomes seguem o original em inglês.
      </p>
    </div>
  )
}
