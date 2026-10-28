import type { Ficha } from '../esquema'
import { CLASSES_CONHECIDAS } from '../novaFicha'
import { nivelTotal } from '../regras'
import { Campo, Lista, Num, Txt } from './campos'

type Props = { ficha: Ficha; mudar: (f: Ficha) => void }

export default function SecaoIdentidade({ ficha: f, mudar }: Props) {
  const em2014 = f.edicao === '2014'
  return (
    <div className="ed-secao">
      <div className="ed-grade">
        <Campo rotulo="Nome do personagem *">
          <Txt valor={f.nome} aoMudar={(nome) => mudar({ ...f, nome })} max={60} rotulo="Nome do personagem" />
        </Campo>
        <Campo rotulo="Nome do jogador">
          <Txt valor={f.jogador ?? ''} aoMudar={(jogador) => mudar({ ...f, jogador: jogador || undefined })} max={60} rotulo="Nome do jogador" />
        </Campo>
        <Campo rotulo="Edição das regras" dica="Define as pequenas diferenças da ficha (ex.: maestrias de armas só existem em 2024).">
          <select
            value={f.edicao}
            aria-label="Edição das regras"
            onChange={(e) => {
              const edicao = e.target.value as Ficha['edicao']
              mudar({ ...f, edicao, maestriasArmas: edicao === '2024' ? (f.maestriasArmas ?? []) : undefined })
            }}
          >
            <option value="2014">D&amp;D 2014</option>
            <option value="2024">D&amp;D 2024</option>
          </select>
        </Campo>
        <Campo rotulo={em2014 ? 'Raça *' : 'Espécie *'} dica={em2014 ? 'Ex.: Anão da Colina, Alto Elfo' : 'Ex.: Anão, Elfo'}>
          <Txt valor={f.especie} aoMudar={(especie) => mudar({ ...f, especie })} rotulo={em2014 ? 'Raça' : 'Espécie'} />
        </Campo>
        <Campo rotulo="Antecedente *">
          <Txt valor={f.antecedente} aoMudar={(antecedente) => mudar({ ...f, antecedente })} rotulo="Antecedente" />
        </Campo>
        <Campo rotulo="Tendência">
          <Txt valor={f.tendencia ?? ''} aoMudar={(tendencia) => mudar({ ...f, tendencia: tendencia || undefined })} max={40} rotulo="Tendência" />
        </Campo>
        <Campo rotulo="Pontos de experiência">
          <Num valor={f.experiencia} aoMudar={(experiencia) => mudar({ ...f, experiencia })} min={0} max={10_000_000} rotulo="Pontos de experiência" />
        </Campo>
      </div>

      <h4 className="ed-subtitulo">Classes (nível total {nivelTotal(f)})</h4>
      <datalist id="classes-conhecidas">
        {CLASSES_CONHECIDAS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Lista<Ficha['classes'][number]>
        itens={f.classes}
        aoMudar={(classes) => mudar({ ...f, classes })}
        novo={() => ({ nome: '', nivel: 1 })}
        rotuloAdicionar="Adicionar classe (multiclasse)"
        max={12}
        render={(c, m) => (
          <>
            <Campo rotulo="Classe *" dica="Pode digitar qualquer classe, mesmo de outros livros.">
              <Txt valor={c.nome} aoMudar={(nome) => m({ nome })} max={40} lista="classes-conhecidas" rotulo="Classe" />
            </Campo>
            <Campo rotulo="Subclasse">
              <Txt valor={c.subclasse ?? ''} aoMudar={(subclasse) => m({ subclasse: subclasse || undefined })} max={60} rotulo="Subclasse" />
            </Campo>
            <Campo rotulo="Nível">
              <Num valor={c.nivel} aoMudar={(nivel) => m({ nivel })} min={1} max={20} rotulo="Nível" className="curto" />
            </Campo>
          </>
        )}
      />
    </div>
  )
}
