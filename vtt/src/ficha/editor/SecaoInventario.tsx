import type { Ficha } from '../esquema'
import { Area, Campo, Lista, Num, Txt } from './campos'

type Props = { ficha: Ficha; mudar: (f: Ficha) => void }

const MOEDAS = [
  ['pc', 'Cobre (PC)'],
  ['pp', 'Prata (PP)'],
  ['pe', 'Electro (PE)'],
  ['po', 'Ouro (PO)'],
  ['pl', 'Platina (PL)'],
] as const

export default function SecaoInventario({ ficha: f, mudar }: Props) {
  return (
    <div className="ed-secao">
      <Lista<Ficha['inventario'][number]>
        itens={f.inventario}
        aoMudar={(inventario) => mudar({ ...f, inventario })}
        novo={() => ({ nome: '', quantidade: 1, equipado: false })}
        rotuloAdicionar="Adicionar item"
        vazio="Nenhum item."
        render={(i, m) => (
          <>
            <Campo rotulo="Item *">
              <Txt valor={i.nome} aoMudar={(nome) => m({ nome })} rotulo="Nome do item" />
            </Campo>
            <Campo rotulo="Quantidade">
              <Num valor={i.quantidade} aoMudar={(quantidade) => m({ quantidade })} min={0} max={9999} rotulo="Quantidade" className="curto" />
            </Campo>
            <Campo rotulo="Peso (kg)">
              <Num valor={i.peso ?? 0} aoMudar={(peso) => m({ peso: peso > 0 ? peso : undefined })} min={0} max={9999} decimal rotulo="Peso" className="curto" />
            </Campo>
            <label className="ed-check">
              <input type="checkbox" checked={i.equipado} onChange={(e) => m({ equipado: e.target.checked })} /> Equipado
            </label>
            <Campo rotulo="Notas" largo>
              <Txt valor={i.notas ?? ''} aoMudar={(notas) => m({ notas: notas || undefined })} max={300} rotulo="Notas do item" />
            </Campo>
          </>
        )}
      />

      <h4 className="ed-subtitulo">Moedas</h4>
      <div className="ed-grade">
        {MOEDAS.map(([chave, nome]) => (
          <Campo key={chave} rotulo={nome}>
            <Num valor={f.moedas[chave]} aoMudar={(v) => mudar({ ...f, moedas: { ...f.moedas, [chave]: v } })} min={0} max={9_999_999} rotulo={nome} />
          </Campo>
        ))}
      </div>

      <h4 className="ed-subtitulo">Anotações</h4>
      <div className="ed-grade">
        <Campo rotulo="Aparência" largo>
          <Area valor={f.notas.aparencia} aoMudar={(aparencia) => mudar({ ...f, notas: { ...f.notas, aparencia } })} rotulo="Aparência" />
        </Campo>
        <Campo rotulo="Personalidade" largo>
          <Area valor={f.notas.personalidade} aoMudar={(personalidade) => mudar({ ...f, notas: { ...f.notas, personalidade } })} rotulo="Personalidade" />
        </Campo>
        <Campo rotulo="História" largo>
          <Area valor={f.notas.historia} aoMudar={(historia) => mudar({ ...f, notas: { ...f.notas, historia } })} max={5000} linhas={5} rotulo="História" />
        </Campo>
        <Campo rotulo="Anotações da campanha" largo>
          <Area valor={f.notas.anotacoes} aoMudar={(anotacoes) => mudar({ ...f, notas: { ...f.notas, anotacoes } })} max={5000} linhas={5} rotulo="Anotações da campanha" />
        </Campo>
      </div>
    </div>
  )
}
