import { useMemo, useState } from 'react'
import FonteTexto from './FonteTexto'
import { LIMITE_DESCRICAO, type Ficha } from '../esquema'
import { bonusProficiencia, modificador } from '../regras'
import {
  classeDaFicha,
  indiceDaClasse,
  ehGenerica,
  lerClasses,
  nomeDaClasse,
  paraCaracteristica,
  type ClasseLida,
  type Contexto,
  type HabilidadeLida,
} from '../importarClasse'

// `indiceClasse` é a linha de classe em que o usuário clicou em "Importar": é ela que recebe nome, nível e subclasse.
type Props = { ficha: Ficha; mudar: (f: Ficha) => void; aberto: boolean; aoFechar: () => void; indiceClasse: number }

type Candidata = { id: string; habilidade: HabilidadeLida; fonte: string }

// Lê o texto .md de uma classe (arquivo, colado ou da área de transferência; é do próprio usuário) e adiciona as
// habilidades até o nível escolhido como características. O conteúdo não sai do navegador.
export default function ImportarClasse({ ficha, mudar, aberto, aoFechar, indiceClasse }: Props) {
  const [classes, setClasses] = useState<ClasseLida[]>([])
  const [arquivo, setArquivo] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [indice, setIndice] = useState(0)
  const [subclasse, setSubclasse] = useState(-1)
  const [nivel, setNivel] = useState(1)
  const [desmarcadas, setDesmarcadas] = useState<Set<string>>(new Set())

  const classe = classes[indice] as ClasseLida | undefined

  const ctx: Contexto = useMemo(
    () => ({ modificador: (a) => modificador(ficha.atributos[a]), bonusProficiencia: bonusProficiencia(ficha) }),
    [ficha],
  )

  function escolherClasse(i: number, lista = classes) {
    const c = lista[i]
    setIndice(i)
    setDesmarcadas(new Set())
    const naFicha = classeDaFicha(ficha, c.nome)
    setNivel(naFicha?.nivel ?? ficha.classes[indiceClasse]?.nivel ?? 1)
    const sub = naFicha?.subclasse?.trim().toLowerCase()
    const achada = sub ? c.subclasses.findIndex((s) => sub.includes(s.nome.toLowerCase()) || s.nome.toLowerCase().includes(sub)) : -1
    setSubclasse(achada)
  }

  function ler(texto: string, origem: string) {
    setAviso('')
    const lista = lerClasses(texto)
    if (lista.length === 0) {
      setClasses([])
      return setErro('Não achei habilidades nesse texto. Esperado o markdown original, com títulos como "#### Level 3: Nome" (classe) ou "***Level 3: Nome.***" (subclasse).')
    }
    setErro('')
    setArquivo(origem)
    setClasses(lista)
    escolherClasse(0, lista)
  }

  const candidatas = useMemo<Candidata[]>(() => {
    if (!classe) return []
    const rotuloClasse = nomeDaClasse(classe.nome)
    const dessa = classe.habilidades
      .filter((h) => h.nivel <= nivel && !ehGenerica(h))
      .map((h, i) => ({ id: `c${i}`, habilidade: h, fonte: `${rotuloClasse} ${h.nivel}` }))
    const sub = subclasse >= 0 ? classe.subclasses[subclasse] : null
    const daSub = sub
      ? sub.habilidades
          .filter((h) => h.nivel <= nivel && !ehGenerica(h))
          .map((h, i) => ({ id: `s${i}`, habilidade: h, fonte: `${sub.nome} ${h.nivel}` }))
      : []
    return [...dessa, ...daSub]
  }, [classe, subclasse, nivel])

  // Linha de classe da ficha que será atualizada: a que já é essa classe; senão, a linha onde se clicou em "Importar".
  const nomeFinal = classe ? nomeDaClasse(classe.nome) : ''
  const existente = classe ? indiceDaClasse(ficha, classe.nome) : -1
  const alvo = existente >= 0 ? existente : Math.min(indiceClasse, ficha.classes.length - 1)
  const atual = ficha.classes[alvo] as Ficha['classes'][number] | undefined
  const subEscolhida = classe && subclasse >= 0 ? classe.subclasses[subclasse].nome : undefined
  const novoNome = existente >= 0 ? atual!.nome : nomeFinal
  const atualiza = !!classe && !!atual && (atual.nome !== novoNome || atual.nivel !== nivel || (subEscolhida !== undefined && atual.subclasse !== subEscolhida))
  const aplicarClasse = atualiza && !desmarcadas.has('extra-classe')

  const jaExiste = (c: Candidata) => ficha.caracteristicas.some((x) => x.nome === c.habilidade.nome.slice(0, 80) && x.fonte === c.fonte)
  const escolhidas = candidatas.filter((c) => !desmarcadas.has(c.id) && !jaExiste(c))

  function alternar(id: string) {
    const novo = new Set(desmarcadas)
    if (!novo.delete(id)) novo.add(id)
    setDesmarcadas(novo)
  }

  function adicionar() {
    let cortadas = 0
    const novas = escolhidas.map((c) => {
      const r = paraCaracteristica(c.habilidade, c.fonte, ctx, LIMITE_DESCRICAO)
      if (r.cortada) cortadas++
      return r.caracteristica
    })
    const classesNovas = aplicarClasse
      ? ficha.classes.map((x, i) => (i === alvo ? { ...x, nome: novoNome.slice(0, 40), nivel, subclasse: (subEscolhida ?? x.subclasse)?.slice(0, 60) || undefined } : x))
      : ficha.classes
    mudar({ ...ficha, classes: classesNovas, caracteristicas: [...ficha.caracteristicas, ...novas] })
    setAviso(`${novas.length} característica(s) adicionada(s).${aplicarClasse ? ` Classe atualizada: ${novoNome}, nível ${nivel}.` : ''}${cortadas ? ` ${cortadas} texto(s) foram cortados no limite de ${LIMITE_DESCRICAO} caracteres.` : ''}`)
    setClasses([])
    setArquivo('')
  }

  if (!aberto) return null

  return (
    <div className="ed-importar aberto">
      <div className="ed-importar-topo">
        <strong>Importar classe</strong>
        <button onClick={aoFechar}>Fechar</button>
      </div>
      <p className="suave">
        Traga o texto .md da classe com as subclasses (títulos <code>#### Level N: Nome</code>). Ele é lido só neste
        navegador e não é enviado a lugar nenhum. As habilidades entram na aba Características, com o texto como está.
      </p>
      <FonteTexto alvo="classe" aoTexto={ler} aoErro={setErro} />
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {aviso && <p className="suave">{aviso}</p>}

      {classe && (
        <>
          <p className="suave">
            <strong>{arquivo}</strong>: {classes.map((c) => `${nomeDaClasse(c.nome)} (${c.habilidades.length} habilidades, ${c.subclasses.length} subclasses)`).join('; ')}
          </p>
          <div className="ed-grade">
            {classes.length > 1 && (
              <label className="ed-campo">
                <span>Classe</span>
                <select value={indice} onChange={(e) => escolherClasse(Number(e.target.value))} aria-label="Classe do arquivo">
                  {classes.map((c, i) => (
                    <option key={c.nome} value={i}>
                      {nomeDaClasse(c.nome)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="ed-campo">
              <span>Até o nível</span>
              <input type="number" min={1} max={20} value={nivel} aria-label="Importar até o nível" onChange={(e) => setNivel(Math.min(20, Math.max(1, Math.round(Number(e.target.value)) || 1)))} />
            </label>
            <label className="ed-campo">
              <span>Subclasse</span>
              <select value={subclasse} onChange={(e) => setSubclasse(Number(e.target.value))} aria-label="Subclasse a importar">
                <option value={-1}>Nenhuma</option>
                {classe.subclasses.map((s, i) => (
                  <option key={s.nome} value={i}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ul className="ed-importar-lista">
            {atualiza && atual && (
              <li>
                <label>
                  <input type="checkbox" checked={aplicarClasse} onChange={() => alternar('extra-classe')} />
                  <span>
                    Atualizar a classe da ficha:{' '}
                    <strong>
                      {novoNome} · nível {nivel}
                      {subEscolhida ? ` · ${subEscolhida}` : ''}
                    </strong>{' '}
                    <span className="suave">
                      (hoje: {atual.nome || 'sem nome'}, nível {atual.nivel}
                      {atual.subclasse ? `, ${atual.subclasse}` : ''})
                    </span>
                  </span>
                </label>
              </li>
            )}
            {candidatas.map((c) => {
              const existe = jaExiste(c)
              const { caracteristica, cortada } = paraCaracteristica(c.habilidade, c.fonte, ctx, LIMITE_DESCRICAO)
              return (
                <li key={c.id} className={existe ? 'existe' : ''}>
                  <label>
                    <input type="checkbox" checked={!existe && !desmarcadas.has(c.id)} disabled={existe} onChange={() => alternar(c.id)} />
                    <span>
                      <strong>{c.habilidade.nome}</strong> <span className="suave">— {c.fonte}</span>
                      {caracteristica.usosMax !== undefined && (
                        <span className="selo">
                          {caracteristica.usosMax} uso(s) · {caracteristica.recarga === 'curto' ? 'descanso curto' : 'descanso longo'}
                        </span>
                      )}
                      {existe && <span className="selo">já está na ficha</span>}
                      {cortada && <span className="selo">texto será cortado</span>}
                    </span>
                  </label>
                  <details>
                    <summary>ver texto</summary>
                    <p className="descricao-longa">{c.habilidade.texto}</p>
                  </details>
                </li>
              )
            })}
            {candidatas.length === 0 && <li className="suave">Nenhuma habilidade até esse nível.</li>}
          </ul>
          <p className="suave">
            Usos e recarga só são preenchidos quando o texto diz com clareza; confira no editor. Entradas genéricas
            (“Subclass feature”, “Ability Score Improvement”) são ignoradas.
          </p>
          <button className="pri" disabled={escolhidas.length === 0 && !aplicarClasse} onClick={adicionar}>
            Adicionar à ficha ({escolhidas.length} habilidade(s){aplicarClasse ? ' + classe' : ''})
          </button>
        </>
      )}
    </div>
  )
}
