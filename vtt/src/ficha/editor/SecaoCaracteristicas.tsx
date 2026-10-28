import type { Ficha } from '../esquema'
import { Area, Campo, Etiquetas, Lista, Num, Txt } from './campos'

type Props = { ficha: Ficha; mudar: (f: Ficha) => void }

type Caract = Ficha['caracteristicas'][number]

export default function SecaoCaracteristicas({ ficha: f, mudar }: Props) {
  return (
    <div className="ed-secao">
      <p className="suave">
        Características de classe, espécie e talentos. Vale <strong>qualquer conteúdo</strong>, inclusive de outros livros: é só
        digitar o nome e a descrição. Com "usos", o app controla quantas vezes pode usar e recarrega nos descansos.
      </p>
      <Lista<Caract>
        itens={f.caracteristicas}
        aoMudar={(caracteristicas) => mudar({ ...f, caracteristicas })}
        novo={() => ({ nome: '', descricao: '' })}
        rotuloAdicionar="Adicionar característica"
        vazio="Nenhuma característica."
        render={(c, m) => (
          <>
            <Campo rotulo="Nome *">
              <Txt valor={c.nome} aoMudar={(nome) => m({ nome })} rotulo="Nome da característica" />
            </Campo>
            <Campo rotulo="Fonte" dica="Ex.: Guerreiro 1, Raça, Talento">
              <Txt valor={c.fonte ?? ''} aoMudar={(fonte) => m({ fonte: fonte || undefined })} rotulo="Fonte da característica" />
            </Campo>
            <Campo rotulo="Usos máximos" dica="0 = sem limite de usos">
              <Num
                valor={c.usosMax ?? 0}
                aoMudar={(n) =>
                  n <= 0
                    ? m({ usosMax: undefined, usosAtuais: undefined, recarga: undefined })
                    : m({ usosMax: n, usosAtuais: Math.min(c.usosAtuais ?? n, n) })
                }
                min={0}
                max={99}
                rotulo="Usos máximos"
                className="curto"
              />
            </Campo>
            <Campo rotulo="Recarrega em">
              <select
                value={c.recarga ?? ''}
                disabled={c.usosMax === undefined}
                aria-label="Recarga"
                onChange={(e) => m({ recarga: e.target.value === '' ? undefined : (e.target.value as 'curto' | 'longo') })}
              >
                <option value="">—</option>
                <option value="curto">Descanso curto</option>
                <option value="longo">Descanso longo</option>
              </select>
            </Campo>
            <Campo rotulo="Descrição" largo>
              <Area valor={c.descricao} aoMudar={(descricao) => m({ descricao })} rotulo="Descrição da característica" />
            </Campo>
          </>
        )}
      />

      <div className="ed-grade" style={{ marginTop: 16 }}>
        <Etiquetas rotulo="Talentos" itens={f.talentos} aoMudar={(talentos) => mudar({ ...f, talentos })} />
        {f.edicao === '2024' && (
          <Etiquetas rotulo="Maestrias de armas" itens={f.maestriasArmas ?? []} aoMudar={(maestriasArmas) => mudar({ ...f, maestriasArmas })} />
        )}
      </div>
    </div>
  )
}
