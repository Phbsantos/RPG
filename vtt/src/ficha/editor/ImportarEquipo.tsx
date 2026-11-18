import { useState } from 'react'
import { LIMITE_DESCRICAO, type Ficha } from '../esquema'
import { libraParaKg, lerEntradas, resumoItem, resumoMagia, rotuloNivel, textoItem, textoMagia, type EntradaLida } from '../importarEquipo'
import FonteTexto from './FonteTexto'

// `aviso` vem do pai: ao importar a 1ª magia a ficha passa a conjurar, a tela muda de estrutura e este painel é recriado.
type Props = { ficha: Ficha; mudar: (f: Ficha) => void; tipo: 'magia' | 'item'; aberto: boolean; aoFechar: () => void; aviso: string; aoAviso: (m: string) => void }
type Conjuracao = NonNullable<Ficha['conjuracao']>

const mesmoNome = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Lê o texto .md de magias ou de itens (arquivo, colado ou da área de transferência; é do próprio usuário) e
// adiciona à ficha. O conteúdo não sai do navegador.
export default function ImportarEquipo({ ficha, mudar, tipo, aberto, aoFechar, aviso, aoAviso }: Props) {
  const [entradas, setEntradas] = useState<EntradaLida[]>([])
  const [origem, setOrigem] = useState('')
  const [erro, setErro] = useState('')
  const [desmarcadas, setDesmarcadas] = useState<Set<number>>(new Set())
  const [preparadas, setPreparadas] = useState(false)

  const magia = tipo === 'magia'
  const palavra = magia ? 'magia' : 'item'

  function ler(texto: string, origemDoTexto: string) {
    aoAviso('')
    const lista = lerEntradas(texto)
    if (lista.length === 0) {
      setEntradas([])
      return setErro(
        magia
          ? 'Não achei magias nesse texto. Esperado o markdown original: "#### Nome", uma linha em itálico "*Level 3 Evocation*" e os dados "- **Casting Time:** …".'
          : 'Não achei itens nesse texto. Esperado o markdown original: "#### Nome", a linha de tipo ("Medium Armor, 400 GP, 20 lb.") e, depois de "---", a descrição.',
      )
    }
    if (!lista.some((e) => e.tipo === tipo)) {
      setEntradas([])
      return setErro(`Esse texto parece ser de ${magia ? 'item' : 'magia'}: importe-o na aba ${magia ? 'Inventário e notas' : 'Magias'}.`)
    }
    setErro('')
    setOrigem(origemDoTexto)
    setEntradas(lista)
    setDesmarcadas(new Set())
  }

  const existe = (e: EntradaLida) =>
    e.tipo === 'magia'
      ? !!ficha.conjuracao && [...ficha.conjuracao.truques, ...ficha.conjuracao.magias.map((m) => m.nome)].some((n) => mesmoNome(n, e.nome))
      : ficha.inventario.some((i) => mesmoNome(i.nome, e.nome))

  const relevantes = entradas.map((e, i) => ({ e, i })).filter(({ e }) => e.tipo === tipo)
  const ignoradas = entradas.length - relevantes.length
  const escolhidas = relevantes.filter(({ e, i }) => !desmarcadas.has(i) && !existe(e))

  function alternar(i: number) {
    const novo = new Set(desmarcadas)
    if (!novo.delete(i)) novo.add(i)
    setDesmarcadas(novo)
  }

  function adicionar() {
    let cortados = 0
    let nova: Ficha = ficha
    if (magia) {
      const base: Conjuracao = ficha.conjuracao ?? { atributo: 'int', espacos: {}, truques: [], magias: [], descricoes: {} }
      const truques = [...base.truques]
      const magias = [...base.magias]
      const descricoes = { ...base.descricoes }
      for (const { e } of escolhidas) {
        if (e.tipo !== 'magia') continue
        const nome = e.nome.slice(0, 80)
        const t = textoMagia(e, LIMITE_DESCRICAO)
        if (t.cortado) cortados++
        descricoes[nome] = t.texto
        if (e.nivel === 0) truques.push(nome)
        else magias.push({ nome, nivel: Math.min(9, Math.max(1, e.nivel)), preparada: preparadas, notas: resumoMagia(e) || undefined })
      }
      nova = { ...ficha, conjuracao: { ...base, truques, magias, descricoes } }
    } else {
      const novos = escolhidas.flatMap(({ e }) => {
        if (e.tipo !== 'item') return []
        const t = textoItem(e, LIMITE_DESCRICAO)
        if (t.cortado) cortados++
        return [
          {
            nome: e.nome.slice(0, 80),
            quantidade: 1,
            peso: e.pesoLb !== null && e.pesoLb > 0 ? libraParaKg(e.pesoLb) : undefined,
            equipado: false,
            notas: resumoItem(e) || undefined,
            descricao: t.texto || undefined,
          },
        ]
      })
      nova = { ...ficha, inventario: [...ficha.inventario, ...novos] }
    }
    mudar(nova)
    aoAviso(`${escolhidas.length} ${palavra}(ns) adicionado(s).${cortados ? ` ${cortados} texto(s) cortados no limite de ${LIMITE_DESCRICAO} caracteres.` : ''}`)
    setEntradas([])
    setOrigem('')
  }

  if (!aberto) return null

  return (
    <div className="ed-importar aberto">
      <div className="ed-importar-topo">
        <strong>Importar {magia ? 'magias e truques' : 'itens'}</strong>
        <button onClick={aoFechar}>Fechar</button>
      </div>
      <p className="suave">
        Traga o texto .md {magia ? 'das magias (título "#### Nome", linha "*Level N Escola*" e dados em lista)' : 'dos itens (título "#### Nome", linha de tipo e, depois de "---", o texto)'}. Pode ter
        várias entradas no mesmo texto. Ele é lido só neste navegador e não é enviado a lugar nenhum.
      </p>
      <FonteTexto alvo={palavra} aoTexto={ler} aoErro={setErro} />
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {aviso && <p className="suave">{aviso}</p>}

      {relevantes.length > 0 && (
        <>
          <p className="suave">
            <strong>{origem}</strong>: {relevantes.length} {palavra}(ns) encontrado(s)
          </p>
          {ignoradas > 0 && (
            <p className="aviso-importar" role="status">
              {ignoradas} entrada(s) parecem ser de {magia ? 'item' : 'magia'} e foram ignoradas aqui; importe-as na aba {magia ? 'Inventário e notas' : 'Magias'}.
            </p>
          )}
          {magia && !ficha.conjuracao && (
            <p className="aviso-importar" role="status">
              Esta ficha ainda não conjura magias: ao adicionar, a conjuração é ativada (atributo Inteligência; ajuste na aba Magias).
            </p>
          )}
          {magia && (
            <label className="ed-check">
              <input type="checkbox" checked={preparadas} onChange={(e) => setPreparadas(e.target.checked)} /> Marcar as magias (de 1º nível em diante) como preparadas
            </label>
          )}
          <ul className="ed-importar-lista">
            {relevantes.map(({ e, i }) => {
              const ja = existe(e)
              return (
                <li key={i} className={ja ? 'existe' : ''}>
                  <label>
                    <input type="checkbox" checked={!ja && !desmarcadas.has(i)} disabled={ja} onChange={() => alternar(i)} />
                    <span>
                      <strong>{e.nome}</strong>{' '}
                      <span className="suave">
                        — {e.tipo === 'magia' ? [rotuloNivel(e), e.classes.join(', ')].filter(Boolean).join(' · ') : [e.categoria, e.raridade].filter(Boolean).join(' · ')}
                      </span>
                      {e.tipo === 'magia' && e.nivel === 0 && <span className="selo">truque</span>}
                      {e.tipo === 'item' && e.pesoLb !== null && <span className="selo">{libraParaKg(e.pesoLb)} kg</span>}
                      {ja && <span className="selo">já está na ficha</span>}
                    </span>
                  </label>
                  <details>
                    <summary>ver texto</summary>
                    <p className="descricao-longa">{e.tipo === 'magia' ? textoMagia(e, LIMITE_DESCRICAO).texto : textoItem(e, LIMITE_DESCRICAO).texto}</p>
                  </details>
                </li>
              )
            })}
          </ul>
          <button className="pri" disabled={escolhidas.length === 0} onClick={adicionar}>
            Adicionar {escolhidas.length} à ficha
          </button>
        </>
      )}
    </div>
  )
}
