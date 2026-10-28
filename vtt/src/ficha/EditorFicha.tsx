import { useRef, useState } from 'react'
import type { Ficha } from './esquema'
import { baixarFicha, lerArquivoFicha, validarFicha } from './arquivo'
import { problemasDaFicha } from './novaFicha'
import { bonusProficiencia, dadosDeConjuracao, formatarBonus, iniciativa, modificador, nivelTotal, percepcaoPassiva, resumoClasses } from './regras'
import SecaoIdentidade from './editor/SecaoIdentidade'
import SecaoAtributos from './editor/SecaoAtributos'
import SecaoProficiencias from './editor/SecaoProficiencias'
import SecaoCombate from './editor/SecaoCombate'
import SecaoMagias from './editor/SecaoMagias'
import SecaoCaracteristicas from './editor/SecaoCaracteristicas'
import SecaoInventario from './editor/SecaoInventario'

type Props = {
  inicial: Ficha
  titulo: string
  aoSalvar: (f: Ficha) => void
  aoCancelar?: () => void
  aoMudar?: (f: Ficha) => void // chamado a cada alteração (ex.: para guardar rascunho)
}

const ABAS = [
  { id: 'identidade', nome: 'Identidade' },
  { id: 'atributos', nome: 'Atributos' },
  { id: 'pericias', nome: 'Perícias' },
  { id: 'combate', nome: 'Combate' },
  { id: 'magias', nome: 'Magias' },
  { id: 'caracteristicas', nome: 'Características' },
  { id: 'inventario', nome: 'Inventário e notas' },
] as const

type AbaId = (typeof ABAS)[number]['id']

export default function EditorFicha({ inicial, titulo, aoSalvar, aoCancelar, aoMudar }: Props) {
  const [f, setF] = useState<Ficha>(inicial)
  const [aba, setAba] = useState<AbaId>('identidade')
  const [erros, setErros] = useState<string[]>([])
  const entradaArquivo = useRef<HTMLInputElement>(null)

  const mudar = (nova: Ficha) => {
    setF(nova)
    setErros([]) // os avisos de uma tentativa de salvar somem assim que a pessoa corrige algo
    aoMudar?.(nova)
  }

  // Confere os problemas comuns e depois o esquema completo. Devolve a ficha normalizada, ou null.
  function conferir(): Ficha | null {
    const problemas = problemasDaFicha(f)
    if (problemas.length > 0) {
      setErros(problemas)
      return null
    }
    const r = validarFicha(f)
    if (!r.ok) {
      setErros(r.erros)
      return null
    }
    setErros([])
    return r.ficha
  }

  async function carregarJson(arquivo: File | undefined) {
    if (!arquivo) return
    const r = await lerArquivoFicha(arquivo)
    if (entradaArquivo.current) entradaArquivo.current.value = ''
    if (!r.ok) return setErros(r.erros)
    if (!window.confirm('Substituir o que está no editor pela ficha deste arquivo?')) return
    setErros([])
    mudar(r.ficha)
  }

  const pendencias = problemasDaFicha(f)
  const conj = dadosDeConjuracao(f)

  return (
    <div className="editor">
      <header className="ed-topo">
        <h2>{titulo}</h2>
        <div className="acoes">
          <label className="botao-arquivo" title="Abrir uma ficha em JSON para editar">
            Carregar JSON
            <input ref={entradaArquivo} type="file" accept=".json,application/json" onChange={(e) => void carregarJson(e.target.files?.[0])} hidden />
          </label>
          <button
            type="button"
            onClick={() => {
              const ok = conferir()
              if (ok) baixarFicha(ok)
            }}
          >
            Baixar JSON
          </button>
          {aoCancelar && (
            <button type="button" onClick={aoCancelar}>
              Cancelar
            </button>
          )}
          <button
            type="button"
            className="pri"
            onClick={() => {
              const ok = conferir()
              if (ok) aoSalvar(ok)
            }}
          >
            Salvar ficha
          </button>
        </div>
      </header>

      {erros.length > 0 && (
        <div className="ed-erros erro" role="alert">
          <strong>Corrija antes de salvar:</strong>
          <ul>
            {erros.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {erros.length > 8 && <p>…e mais {erros.length - 8} problema(s).</p>}
        </div>
      )}

      <div className="ed-corpo">
        <div className="ed-principal">
          <nav className="ed-abas" role="tablist" aria-label="Seções da ficha">
            {ABAS.map((a) => (
              <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'on' : ''} onClick={() => setAba(a.id)}>
                {a.nome}
              </button>
            ))}
          </nav>
          {aba === 'identidade' && <SecaoIdentidade ficha={f} mudar={mudar} />}
          {aba === 'atributos' && <SecaoAtributos ficha={f} mudar={mudar} />}
          {aba === 'pericias' && <SecaoProficiencias ficha={f} mudar={mudar} />}
          {aba === 'combate' && <SecaoCombate ficha={f} mudar={mudar} />}
          {aba === 'magias' && <SecaoMagias ficha={f} mudar={mudar} />}
          {aba === 'caracteristicas' && <SecaoCaracteristicas ficha={f} mudar={mudar} />}
          {aba === 'inventario' && <SecaoInventario ficha={f} mudar={mudar} />}
        </div>

        <aside className="ed-resumo" aria-label="Resumo calculado">
          <h4>{f.nome.trim() || 'Sem nome'}</h4>
          <p className="suave">
            {resumoClasses(f) || 'Sem classe'} · {f.edicao}
          </p>
          <dl>
            <dt>Nível total</dt>
            <dd>{nivelTotal(f)}</dd>
            <dt>Proficiência</dt>
            <dd>{formatarBonus(bonusProficiencia(f))}</dd>
            <dt>CA</dt>
            <dd>{f.combate.ca}</dd>
            <dt>PV</dt>
            <dd>
              {f.combate.pv.atual}/{f.combate.pv.max}
            </dd>
            <dt>Iniciativa</dt>
            <dd>{formatarBonus(iniciativa(f))}</dd>
            <dt>Percepção passiva</dt>
            <dd>{percepcaoPassiva(f)}</dd>
            <dt>Mod. Constituição</dt>
            <dd>{formatarBonus(modificador(f.atributos.con))}</dd>
            {conj && (
              <>
                <dt>CD de magia</dt>
                <dd>{conj.cd}</dd>
                <dt>Ataque de magia</dt>
                <dd>{formatarBonus(conj.ataque)}</dd>
              </>
            )}
          </dl>
          {pendencias.length > 0 ? (
            <div className="aviso" style={{ marginTop: 10, fontSize: '0.8rem' }}>
              <strong>Falta preencher:</strong>
              <ul>
                {pendencias.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="ok" style={{ marginTop: 10, fontSize: '0.85rem' }}>✓ Pronta para salvar.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
