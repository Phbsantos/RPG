import { useState } from 'react'
import { ATRIBUTOS, NOMES_ATRIBUTO, type Ficha } from '../esquema'
import { aplicarEspacos, type TipoConjurador } from '../novaFicha'
import { nivelTotal } from '../regras'
import { Campo, Etiquetas, Lista, Num, Txt } from './campos'

type Props = { ficha: Ficha; mudar: (f: Ficha) => void }

export default function SecaoMagias({ ficha: f, mudar }: Props) {
  const [tipo, setTipo] = useState<TipoConjurador>('completo')
  const [nivel, setNivel] = useState<number | null>(null)
  const conj = f.conjuracao

  if (!conj) {
    return (
      <div className="ed-secao">
        <p className="suave">Este personagem não conjura magias.</p>
        <button type="button" onClick={() => mudar({ ...f, conjuracao: { atributo: 'int', espacos: {}, truques: [], magias: [] } })}>
          Ele conjura magias: ativar
        </button>
      </div>
    )
  }

  const alterar = (parcial: Partial<NonNullable<Ficha['conjuracao']>>) => mudar({ ...f, conjuracao: { ...conj, ...parcial } })
  const nivelConj = nivel ?? Math.min(20, nivelTotal(f))

  const definirEspaco = (n: number, total: number) => {
    const espacos = { ...conj.espacos }
    if (total <= 0) delete espacos[String(n)]
    else espacos[String(n)] = { total, usados: Math.min(espacos[String(n)]?.usados ?? 0, total) }
    alterar({ espacos })
  }

  return (
    <div className="ed-secao">
      <div className="acoes">
        <Campo rotulo="Atributo de conjuração">
          <select value={conj.atributo} aria-label="Atributo de conjuração" onChange={(e) => alterar({ atributo: e.target.value as 'int' })}>
            {ATRIBUTOS.map((a) => (
              <option key={a} value={a}>
                {NOMES_ATRIBUTO[a]}
              </option>
            ))}
          </select>
        </Campo>
        <button type="button" onClick={() => mudar({ ...f, conjuracao: undefined })}>Remover conjuração</button>
      </div>

      <h4 className="ed-subtitulo">Espaços de magia</h4>
      <div className="ed-sugestao">
        <Campo rotulo="Tipo de conjurador">
          <select value={tipo} aria-label="Tipo de conjurador" onChange={(e) => setTipo(e.target.value as TipoConjurador)}>
            <option value="completo">Completo (Mago, Clérigo, Bardo…)</option>
            <option value="meio">Meio (Paladino, Patrulheiro)</option>
            <option value="terco">Um terço (Cav. Místico, Trapaceiro Arcano)</option>
          </select>
        </Campo>
        <Campo rotulo="Nível de conjurador">
          <Num valor={nivelConj} aoMudar={setNivel} min={1} max={20} rotulo="Nível de conjurador" className="curto" />
        </Campo>
        <button type="button" onClick={() => mudar(aplicarEspacos(f, tipo, nivelConj))}>Sugerir espaços</button>
      </div>
      <p className="suave">Vale para uma classe só. Em multiclasse ou Bruxo (Magia de Pacto), digite os espaços abaixo.</p>
      <div className="ed-espacos">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Campo key={n} rotulo={`${n}º nível`}>
            <Num valor={conj.espacos[String(n)]?.total ?? 0} aoMudar={(t) => definirEspaco(n, t)} min={0} max={9} rotulo={`Espaços de ${n}º nível`} className="curto" />
          </Campo>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Etiquetas rotulo="Truques" itens={conj.truques} aoMudar={(truques) => alterar({ truques })} placeholder="Nome do truque + Enter" />
      </div>

      <h4 className="ed-subtitulo">Magias</h4>
      <Lista<NonNullable<Ficha['conjuracao']>['magias'][number]>
        itens={conj.magias}
        aoMudar={(magias) => alterar({ magias })}
        novo={() => ({ nome: '', nivel: 1, preparada: false })}
        rotuloAdicionar="Adicionar magia"
        vazio="Nenhuma magia."
        render={(m, mud) => (
          <>
            <Campo rotulo="Nome *">
              <Txt valor={m.nome} aoMudar={(nome) => mud({ nome })} rotulo="Nome da magia" />
            </Campo>
            <Campo rotulo="Nível">
              <Num valor={m.nivel} aoMudar={(nivel) => mud({ nivel })} min={1} max={9} rotulo="Nível da magia" className="curto" />
            </Campo>
            <label className="ed-check">
              <input type="checkbox" checked={m.preparada} onChange={(e) => mud({ preparada: e.target.checked })} /> Preparada
            </label>
            <Campo rotulo="Notas" largo>
              <Txt valor={m.notas ?? ''} aoMudar={(notas) => mud({ notas: notas || undefined })} max={300} rotulo="Notas da magia" />
            </Campo>
          </>
        )}
      />
    </div>
  )
}
