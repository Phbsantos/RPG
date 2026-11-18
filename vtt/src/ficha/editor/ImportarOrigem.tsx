import { useMemo, useState } from 'react'
import FonteTexto from './FonteTexto'
import { LIMITE_DESCRICAO, type Ficha } from '../esquema'
import { bonusProficiencia, modificador } from '../regras'
import type { Contexto } from '../importarClasse'
import { deslocamentoEmMetros, itensDaOrigem, lerOrigens, tipoProvavel, type Origem } from '../importarOrigem'

type Props = { ficha: Ficha; mudar: (f: Ficha) => void; tipo: 'especie' | 'talento'; aberto: boolean; aoFechar: () => void }

// Lê o texto .md de uma espécie/raça ou de um talento (arquivo, colado ou da área de transferência; é do próprio
// usuário) e adiciona o conteúdo à ficha. O conteúdo não sai do navegador.
export default function ImportarOrigem({ ficha, mudar, tipo, aberto, aoFechar }: Props) {
  const [origens, setOrigens] = useState<Origem[]>([])
  const [arquivo, setArquivo] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [indice, setIndice] = useState(0)
  const [nomeEditado, setNomeEditado] = useState<string | null>(null)
  const [desmarcadas, setDesmarcadas] = useState<Set<string>>(new Set())

  const especie = tipo === 'especie'
  const palavra = especie ? (ficha.edicao === '2014' ? 'raça' : 'espécie') : 'talento'
  const base = origens[indice] as Origem | undefined
  // O nome vem do título "## Nome"; se o texto colado não tinha título, dá para corrigir no campo "Nome".
  const origem = useMemo(
    () => (base && nomeEditado !== null && nomeEditado.trim() ? { ...base, nome: nomeEditado.trim().slice(0, 80) } : base),
    [base, nomeEditado],
  )

  const ctx: Contexto = useMemo(
    () => ({ modificador: (a) => modificador(ficha.atributos[a]), bonusProficiencia: bonusProficiencia(ficha) }),
    [ficha],
  )

  function ler(texto: string, origemDoTexto: string) {
    setAviso('')
    const lista = lerOrigens(texto, origemDoTexto)
    if (lista.length === 0) {
      setOrigens([])
      return setErro('Não achei conteúdo nesse texto. Esperado o markdown original: um título "## Nome" e traços como "***Nome do traço.*** texto".')
    }
    setErro('')
    setArquivo(origemDoTexto)
    setOrigens(lista)
    setIndice(0)
    setNomeEditado(null)
    setDesmarcadas(new Set())
  }

  const itens = useMemo(() => (origem ? itensDaOrigem(origem, tipo, ctx, LIMITE_DESCRICAO) : []), [origem, tipo, ctx])
  const jaExiste = (nome: string, fonte?: string) => ficha.caracteristicas.some((x) => x.nome === nome && x.fonte === fonte)

  const metros = origem && especie ? deslocamentoEmMetros(origem) : null
  const trocaNome = origem && especie ? ficha.especie !== origem.nome : false
  const entraNosTalentos = origem && !especie ? !ficha.talentos.includes(origem.nome) : false

  // Extras que mexem em outros campos da ficha (espécie: nome e deslocamento; talento: lista de talentos).
  const EXTRA_NOME = 'extra-nome'
  const EXTRA_VELOCIDADE = 'extra-velocidade'
  const EXTRA_TALENTO = 'extra-talento'
  const marcado = (id: string) => !desmarcadas.has(id)

  const escolhidas = itens.filter((i) => marcado(i.id) && !jaExiste(i.caracteristica.nome, i.caracteristica.fonte))
  const mudancas =
    (especie && trocaNome && marcado(EXTRA_NOME) ? 1 : 0) +
    (especie && metros !== null && metros !== ficha.combate.deslocamento && marcado(EXTRA_VELOCIDADE) ? 1 : 0) +
    (entraNosTalentos && marcado(EXTRA_TALENTO) ? 1 : 0)

  function alternar(id: string) {
    const novo = new Set(desmarcadas)
    if (!novo.delete(id)) novo.add(id)
    setDesmarcadas(novo)
  }

  function adicionar() {
    if (!origem) return
    let nova: Ficha = { ...ficha, caracteristicas: [...ficha.caracteristicas, ...escolhidas.map((i) => i.caracteristica)] }
    if (especie && trocaNome && marcado(EXTRA_NOME)) nova = { ...nova, especie: origem.nome.slice(0, 80) }
    if (especie && metros !== null && marcado(EXTRA_VELOCIDADE)) nova = { ...nova, combate: { ...nova.combate, deslocamento: metros } }
    if (entraNosTalentos && marcado(EXTRA_TALENTO)) nova = { ...nova, talentos: [...nova.talentos, origem.nome.slice(0, 80)] }
    mudar(nova)
    const cortadas = escolhidas.filter((i) => i.cortada).length
    setAviso(
      `${origem.nome}: ${escolhidas.length} característica(s) adicionada(s) (aba Características).${cortadas ? ` ${cortadas} texto(s) cortados no limite de ${LIMITE_DESCRICAO} caracteres.` : ''}`,
    )
    setOrigens([])
    setArquivo('')
  }

  if (!aberto) return null

  const provavel = origem ? tipoProvavel(origem) : null
  return (
    <div className="ed-importar aberto">
      <div className="ed-importar-topo">
        <strong>Importar {palavra}</strong>
        <button onClick={aoFechar}>Fechar</button>
      </div>
      <p className="suave">
        Traga o texto .md {especie ? 'da raça/espécie' : 'do talento'} (título <code>## Nome</code> e traços{' '}
        <code>***Nome.*** texto</code>). Ele é lido só neste navegador e não é enviado a lugar nenhum. O texto fica como está.
      </p>
      <FonteTexto alvo={palavra} aoTexto={ler} aoErro={setErro} />
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {aviso && <p className="suave">{aviso}</p>}

      {origem && (
        <>
          <p className="suave">
            <strong>{arquivo}</strong>: {origens.length === 1 ? origem.nome : `${origens.length} entradas`}
            {origem.subtitulo && <> — {origem.subtitulo}</>}
          </p>
          <label className="ed-campo">
            <span>Nome</span>
            <input
              value={nomeEditado ?? base?.nome ?? ''}
              maxLength={80}
              aria-label={`Nome d${especie ? 'a ' : 'o '}${palavra}`}
              onChange={(e) => setNomeEditado(e.target.value)}
            />
          </label>
          {origens.length > 1 && (
            <label className="ed-campo">
              <span>Entrada do texto</span>
              <select value={indice} aria-label="Entrada do arquivo" onChange={(e) => { setIndice(Number(e.target.value)); setNomeEditado(null); setDesmarcadas(new Set()) }}>
                {origens.map((o, i) => (
                  <option key={`${o.nome}-${i}`} value={i}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          {provavel && provavel !== tipo && (
            <p className="aviso-importar" role="status">
              Esse arquivo parece ser de {provavel === 'talento' ? 'talento' : 'raça/espécie'}; você está importando como {palavra}.
            </p>
          )}

          <ul className="ed-importar-lista">
            {especie && trocaNome && (
              <li>
                <label>
                  <input type="checkbox" checked={marcado(EXTRA_NOME)} onChange={() => alternar(EXTRA_NOME)} />
                  <span>
                    Definir {palavra} como <strong>{origem.nome}</strong> <span className="suave">(hoje: {ficha.especie || 'vazio'})</span>
                  </span>
                </label>
              </li>
            )}
            {especie && metros !== null && metros !== ficha.combate.deslocamento && (
              <li>
                <label>
                  <input type="checkbox" checked={marcado(EXTRA_VELOCIDADE)} onChange={() => alternar(EXTRA_VELOCIDADE)} />
                  <span>
                    Deslocamento de <strong>{metros} m</strong> <span className="suave">(hoje: {ficha.combate.deslocamento} m)</span>
                  </span>
                </label>
              </li>
            )}
            {entraNosTalentos && origem && (
              <li>
                <label>
                  <input type="checkbox" checked={marcado(EXTRA_TALENTO)} onChange={() => alternar(EXTRA_TALENTO)} />
                  <span>
                    Incluir <strong>{origem.nome}</strong> na lista de Talentos
                  </span>
                </label>
              </li>
            )}
            {itens.map((i) => {
              const existe = jaExiste(i.caracteristica.nome, i.caracteristica.fonte)
              const c = i.caracteristica
              return (
                <li key={i.id} className={existe ? 'existe' : ''}>
                  <label>
                    <input type="checkbox" checked={!existe && marcado(i.id)} disabled={existe} onChange={() => alternar(i.id)} />
                    <span>
                      <strong>{c.nome}</strong> <span className="suave">— {c.fonte}</span>
                      {c.usosMax !== undefined && (
                        <span className="selo">
                          {c.usosMax} uso(s) · {c.recarga === 'curto' ? 'descanso curto' : 'descanso longo'}
                        </span>
                      )}
                      {existe && <span className="selo">já está na ficha</span>}
                      {i.cortada && <span className="selo">texto será cortado</span>}
                    </span>
                  </label>
                  <details>
                    <summary>ver texto</summary>
                    <p className="descricao-longa">{c.descricao}</p>
                  </details>
                </li>
              )
            })}
          </ul>
          <p className="suave">Usos e recarga só são preenchidos quando o texto diz com clareza; confira no editor.</p>
          <button className="pri" disabled={escolhidas.length + mudancas === 0} onClick={adicionar}>
            Adicionar à ficha ({escolhidas.length} característica(s){mudancas ? ` + ${mudancas} ajuste(s)` : ''})
          </button>
        </>
      )}
    </div>
  )
}
