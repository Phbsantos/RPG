import { useRef, useState } from 'react'
import { ATRIBUTOS, NOMES_ATRIBUTO, PERICIAS, type Atributo, type Ficha, type PericiaId } from './esquema'
import { bonusPericia, bonusSalvaguarda, formatarBonus, modificador } from './regras'

type Props = {
  ficha: Ficha | null
  erros: string[]
  aoTestar: (rotulo: string, bonus: number) => void
  aoAbrir: () => void
  aoBaixar: () => void
  aoRemover: () => void
  aoArquivo: (arquivo: File | undefined) => void
  aoEditar: () => void
  aoCriar: () => void
}

const NOME_CURTO: Record<Atributo, string> = {
  for: 'FORÇA',
  des: 'DESTREZA',
  con: 'CONSTIT.',
  int: 'INTELIG.',
  sab: 'SABEDORIA',
  car: 'CARISMA',
}

// Bloco da coluna direita: atributos, salvaguardas e perícias. Clicar em qualquer número rola o teste.
export default function BlocoFicha({ ficha, erros, aoTestar, aoAbrir, aoBaixar, aoRemover, aoArquivo, aoEditar, aoCriar }: Props) {
  const [todas, setTodas] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  const escolher = (arquivo: File | undefined) => {
    aoArquivo(arquivo)
    if (entrada.current) entrada.current.value = ''
  }

  const mensagemErros = erros.length > 0 && (
    <div className="erro" role="alert" style={{ marginTop: 8, fontSize: '0.8rem' }}>
      <p>Não consegui ler essa ficha:</p>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
        {erros.slice(0, 6).map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
      {erros.length > 6 && <p>…e mais {erros.length - 6} problema(s).</p>}
    </div>
  )

  if (!ficha) {
    return (
      <section className="bloco-ficha">
        <h4>Minha ficha</h4>
        <p className="suave" style={{ marginBottom: 8 }}>Carregue o JSON do seu personagem para rolar testes e acompanhar PV e recursos.</p>
        <input ref={entrada} type="file" accept=".json,application/json" onChange={(e) => escolher(e.target.files?.[0])} aria-label="Carregar ficha" style={{ width: '100%' }} />
        <div className="acoes" style={{ marginTop: 8 }}>
          <button className="pri" onClick={aoCriar}>Criar ficha</button>
        </div>
        <p className="suave" style={{ marginTop: 8, fontSize: '0.8rem' }}>
          Sem ficha? Baixe um exemplo:{' '}
          <a href="exemplos/elowen-2014.json" download>Elowen (2014)</a> ·{' '}
          <a href="exemplos/brann-2024.json" download>Brann (2024)</a>
        </p>
        {mensagemErros}
      </section>
    )
  }

  const ids = Object.keys(PERICIAS) as PericiaId[]
  const visiveis = todas ? ids : ids.filter((id) => ficha.proficiencias.pericias[id])

  return (
    <section className="bloco-ficha">
      <h4>
        Ficha de {ficha.nome.split(' ')[0]} <small>clique para rolar</small>
      </h4>

      <div className="atributos">
        {ATRIBUTOS.map((a) => (
          <button
            key={a}
            className="atributo"
            title="Rolar teste de atributo"
            onClick={() => aoTestar(`${NOMES_ATRIBUTO[a]} (teste)`, modificador(ficha.atributos[a]))}
          >
            <small>{NOME_CURTO[a]}</small>
            <b>{ficha.atributos[a]}</b>
            <span>{formatarBonus(modificador(ficha.atributos[a]))}</span>
          </button>
        ))}
      </div>

      <div className="salvas">
        {ATRIBUTOS.map((a) => (
          <button
            key={a}
            title="Rolar salvaguarda"
            onClick={() => aoTestar(`${NOMES_ATRIBUTO[a]} (salvaguarda)`, bonusSalvaguarda(ficha, a))}
          >
            {ficha.proficiencias.salvaguardas.includes(a) ? '● ' : '○ '}
            Salv. {a.toUpperCase()} {formatarBonus(bonusSalvaguarda(ficha, a))}
          </button>
        ))}
      </div>

      <div className="pericias">
        {visiveis.map((id) => (
          <button
            key={id}
            title="Rolar perícia"
            className={ficha.proficiencias.pericias[id] ? '' : 'nao'}
            onClick={() => aoTestar(PERICIAS[id].nome, bonusPericia(ficha, id))}
          >
            <span>
              {ficha.proficiencias.pericias[id] === 'especialista' ? '◆ ' : ficha.proficiencias.pericias[id] ? '● ' : '○ '}
              {PERICIAS[id].nome}
            </span>
            <b>{formatarBonus(bonusPericia(ficha, id))}</b>
          </button>
        ))}
      </div>
      <button style={{ marginTop: 8, padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setTodas(!todas)}>
        {todas ? 'Só as proficientes' : `Todas as perícias (${ids.length})`}
      </button>

      <div className="acoes" style={{ marginTop: 10 }}>
        <button className="pri" onClick={aoAbrir}>Ficha completa</button>
        <button onClick={aoEditar}>Editar ficha</button>
        <button onClick={aoBaixar}>Baixar JSON</button>
        <button onClick={aoRemover}>Remover</button>
      </div>
      {mensagemErros}
    </section>
  )
}
