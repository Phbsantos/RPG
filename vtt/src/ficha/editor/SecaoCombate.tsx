import { useState } from 'react'
import type { Ficha } from '../esquema'
import { pvSugerido } from '../novaFicha'
import { Campo, Lista, Num, Txt } from './campos'

type Props = { ficha: Ficha; mudar: (f: Ficha) => void }

export default function SecaoCombate({ ficha: f, mudar }: Props) {
  const c = f.combate
  const [aviso, setAviso] = useState('')
  const alterar = (parcial: Partial<Ficha['combate']>) => mudar({ ...f, combate: { ...c, ...parcial } })

  function sugerirPv() {
    const s = pvSugerido(f)
    if (!s) {
      setAviso('Não reconheci alguma das classes, então digite o PV e os dados de vida à mão.')
      return
    }
    setAviso(`PV máximo ${s.pv} (valor médio dos dados + Constituição em cada nível). O 1º nível usa o dado cheio.`)
    alterar({ pv: { ...c.pv, max: s.pv, atual: s.pv }, dadosVida: s.dadosVida })
  }

  return (
    <div className="ed-secao">
      <div className="ed-grade">
        <Campo rotulo="Classe de armadura (CA)">
          <Num valor={c.ca} aoMudar={(ca) => alterar({ ca })} min={0} max={40} rotulo="Classe de armadura" />
        </Campo>
        <Campo rotulo="Bônus de iniciativa extra" dica="Além do modificador de Destreza (ex.: talento Alerta).">
          <Num valor={c.iniciativaBonus} aoMudar={(iniciativaBonus) => alterar({ iniciativaBonus })} min={-20} max={20} rotulo="Bônus de iniciativa extra" />
        </Campo>
        <Campo rotulo="Deslocamento (metros)" dica="9 m = 30 pés.">
          <Num valor={c.deslocamento} aoMudar={(deslocamento) => alterar({ deslocamento })} min={0} max={300} decimal rotulo="Deslocamento" />
        </Campo>
      </div>

      <h4 className="ed-subtitulo">Pontos de vida</h4>
      <div className="ed-grade">
        <Campo rotulo="PV máximo">
          <Num
            valor={c.pv.max}
            aoMudar={(max) => alterar({ pv: { ...c.pv, max, atual: Math.min(c.pv.atual, max) } })}
            min={1}
            max={999}
            rotulo="PV máximo"
          />
        </Campo>
        <Campo rotulo="PV atual">
          <Num valor={c.pv.atual} aoMudar={(atual) => alterar({ pv: { ...c.pv, atual } })} min={0} max={999} rotulo="PV atual" />
        </Campo>
        <Campo rotulo="PV temporário">
          <Num valor={c.pv.temporario} aoMudar={(temporario) => alterar({ pv: { ...c.pv, temporario } })} min={0} max={999} rotulo="PV temporário" />
        </Campo>
      </div>
      <div className="acoes" style={{ marginTop: 8 }}>
        <button type="button" onClick={sugerirPv}>Sugerir PV e dados de vida</button>
        {aviso && <span className="suave">{aviso}</span>}
      </div>

      <h4 className="ed-subtitulo">Dados de vida</h4>
      <Lista<Ficha['combate']['dadosVida'][number]>
        itens={c.dadosVida}
        aoMudar={(dadosVida) => alterar({ dadosVida })}
        novo={() => ({ dado: 'd8' as const, total: 1, usados: 0 })}
        rotuloAdicionar="Adicionar dado de vida"
        max={6}
        vazio="Nenhum. O botão acima preenche pelas classes."
        render={(d, m) => (
          <>
            <Campo rotulo="Dado">
              <select value={d.dado} aria-label="Tipo de dado de vida" onChange={(e) => m({ dado: e.target.value as 'd6' })}>
                {['d6', 'd8', 'd10', 'd12'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Total">
              <Num valor={d.total} aoMudar={(total) => m({ total, usados: Math.min(d.usados, total) })} min={1} max={20} rotulo="Total de dados" className="curto" />
            </Campo>
            <Campo rotulo="Já usados">
              <Num valor={d.usados} aoMudar={(usados) => m({ usados })} min={0} max={d.total} rotulo="Dados usados" className="curto" />
            </Campo>
          </>
        )}
      />

      <h4 className="ed-subtitulo">Ataques</h4>
      <Lista<Ficha['ataques'][number]>
        itens={f.ataques}
        aoMudar={(ataques) => mudar({ ...f, ataques })}
        novo={() => ({ nome: '', bonus: 0, dano: '1d6' })}
        rotuloAdicionar="Adicionar ataque"
        vazio="Nenhum ataque. Cada ataque vira um botão de rolagem na ficha."
        render={(a, m) => (
          <>
            <Campo rotulo="Nome *">
              <Txt valor={a.nome} aoMudar={(nome) => m({ nome })} rotulo="Nome do ataque" />
            </Campo>
            <Campo rotulo="Bônus de ataque" dica="O total (atributo + proficiência + itens).">
              <Num valor={a.bonus} aoMudar={(bonus) => m({ bonus })} min={-20} max={30} rotulo="Bônus de ataque" className="curto" />
            </Campo>
            <Campo rotulo="Dano" dica="Ex.: 1d8+3">
              <Txt valor={a.dano} aoMudar={(dano) => m({ dano })} max={40} rotulo="Dano" />
            </Campo>
            <Campo rotulo="Tipo de dano">
              <Txt valor={a.tipoDano ?? ''} aoMudar={(tipoDano) => m({ tipoDano: tipoDano || undefined })} max={40} rotulo="Tipo de dano" />
            </Campo>
            <Campo rotulo="Notas" largo>
              <Txt valor={a.notas ?? ''} aoMudar={(notas) => m({ notas: notas || undefined })} max={300} rotulo="Notas do ataque" />
            </Campo>
          </>
        )}
      />
    </div>
  )
}
