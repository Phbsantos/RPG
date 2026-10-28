import { useState } from 'react'
import {
  ATRIBUTOS,
  CONDICOES,
  NOMES_ATRIBUTO,
  PERICIAS,
  type Ficha,
  type PericiaId,
} from './esquema'
import {
  aplicarCura,
  aplicarDano,
  atualizarPv,
  bonusPericia,
  bonusProficiencia,
  bonusSalvaguarda,
  dadosDeConjuracao,
  descansoCurto,
  descansoLongo,
  formatarBonus,
  iniciativa,
  modificador,
  percepcaoPassiva,
  resumoClasses,
} from './regras'

type Props = {
  ficha: Ficha
  aoMudar: (f: Ficha) => void
  aoTestar: (rotulo: string, bonus: number) => void // teste de d20 (respeita vantagem/desvantagem)
  aoRolarDano: (rotulo: string, formula: string) => void
}

export default function FichaVista({ ficha, aoMudar, aoTestar, aoRolarDano }: Props) {
  const { combate } = ficha
  const [quantia, setQuantia] = useState(1)
  const [condicaoNova, setCondicaoNova] = useState('')
  const conj = dadosDeConjuracao(ficha)

  const mudarCombate = (parcial: Partial<Ficha['combate']>) =>
    aoMudar({ ...ficha, combate: { ...combate, ...parcial } })

  const mudarUso = (indice: number, delta: number) =>
    aoMudar({
      ...ficha,
      caracteristicas: ficha.caracteristicas.map((c, i) =>
        i === indice && c.usosMax !== undefined
          ? { ...c, usosAtuais: Math.min(c.usosMax, Math.max(0, (c.usosAtuais ?? c.usosMax) + delta)) }
          : c,
      ),
    })

  const alternarEspaco = (nivel: string, indice: number) => {
    if (!ficha.conjuracao) return
    const espaco = ficha.conjuracao.espacos[nivel]
    // Clicar num círculo marca-o e os anteriores como usados; clicar no último usado devolve um.
    const usados = indice + 1 === espaco.usados ? indice : indice + 1
    aoMudar({
      ...ficha,
      conjuracao: {
        ...ficha.conjuracao,
        espacos: { ...ficha.conjuracao.espacos, [nivel]: { ...espaco, usados } },
      },
    })
  }

  const mudarDadoVida = (indice: number, delta: number) =>
    mudarCombate({
      dadosVida: combate.dadosVida.map((d, i) =>
        i === indice ? { ...d, usados: Math.min(d.total, Math.max(0, d.usados + delta)) } : d,
      ),
    })

  const mudarMoeda = (tipo: keyof Ficha['moedas'], valor: number) =>
    aoMudar({ ...ficha, moedas: { ...ficha.moedas, [tipo]: Math.max(0, Math.floor(valor) || 0) } })

  return (
    <section className="ficha">
      <header className="ficha-topo">
        <div>
          <h2>
            {ficha.nome} <span className="selo">D&amp;D {ficha.edicao}</span>
          </h2>
          <p>
            {resumoClasses(ficha)} · {ficha.especie} · {ficha.antecedente}
            {ficha.tendencia && ` · ${ficha.tendencia}`}
          </p>
        </div>
        <div className="acoes">
          <button onClick={() => aoMudar(descansoCurto(ficha))}>Descanso curto</button>
          <button onClick={() => aoMudar(descansoLongo(ficha))}>Descanso longo</button>
        </div>
      </header>

      <div className="ficha-grade">
        <div className="cartao">
          <h3>Combate</h3>
          <div className="numeros">
            <Numero rotulo="CA" valor={combate.ca} />
            <Numero
              rotulo="Iniciativa"
              valor={formatarBonus(iniciativa(ficha))}
              aoClicar={() => aoTestar('Iniciativa', iniciativa(ficha))}
            />
            <Numero rotulo="Deslocamento" valor={`${combate.deslocamento} m`} />
            <Numero rotulo="Prof." valor={formatarBonus(bonusProficiencia(ficha))} />
            <Numero rotulo="Perc. passiva" valor={percepcaoPassiva(ficha)} />
            {conj && <Numero rotulo="CD magia" valor={conj.cd} />}
            {conj && <Numero rotulo="Atq. magia" valor={formatarBonus(conj.ataque)} />}
          </div>

          <p className="pv">
            PV <strong>{combate.pv.atual}</strong> / {combate.pv.max}
            {combate.pv.temporario > 0 && ` (+${combate.pv.temporario} temp.)`}
          </p>
          <div className="acoes">
            <input
              type="number"
              min={1}
              value={quantia}
              onChange={(e) => setQuantia(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
              aria-label="Quantidade"
              className="curto"
            />
            <button onClick={() => aoMudar(aplicarDano(ficha, quantia))}>Dano</button>
            <button onClick={() => aoMudar(aplicarCura(ficha, quantia))}>Cura</button>
            <button onClick={() => aoMudar(atualizarPv(ficha, { temporario: quantia }))}>PV temp.</button>
          </div>

          {combate.pv.atual === 0 && (
            <div className="morte">
              Salvaguardas contra a morte —
              <Marcadores
                rotulo="Sucessos"
                total={3}
                marcados={combate.salvaguardasContraMorte.sucessos}
                aoMudar={(n) =>
                  mudarCombate({ salvaguardasContraMorte: { ...combate.salvaguardasContraMorte, sucessos: n } })
                }
              />
              <Marcadores
                rotulo="Falhas"
                total={3}
                marcados={combate.salvaguardasContraMorte.falhas}
                aoMudar={(n) =>
                  mudarCombate({ salvaguardasContraMorte: { ...combate.salvaguardasContraMorte, falhas: n } })
                }
              />
            </div>
          )}

          {combate.dadosVida.map((d, i) => (
            <div className="linha" key={i}>
              <span>
                Dados de vida {d.dado}: {d.total - d.usados}/{d.total}
              </span>
              <span>
                <button onClick={() => mudarDadoVida(i, 1)}>Usar</button>
                <button onClick={() => mudarDadoVida(i, -1)}>Devolver</button>
              </span>
            </div>
          ))}

          <label className="linha">
            <span>Inspiração</span>
            <input
              type="checkbox"
              checked={combate.inspiracao}
              onChange={(e) => mudarCombate({ inspiracao: e.target.checked })}
            />
          </label>
          <div className="linha">
            <span>Exaustão: {combate.exaustao}</span>
            <span>
              <button onClick={() => mudarCombate({ exaustao: Math.max(0, combate.exaustao - 1) })}>−</button>
              <button onClick={() => mudarCombate({ exaustao: Math.min(6, combate.exaustao + 1) })}>+</button>
            </span>
          </div>

          <div className="etiquetas">
            {combate.condicoes.map((c) => (
              <button
                key={c}
                className="etiqueta"
                title="Remover condição"
                onClick={() => mudarCombate({ condicoes: combate.condicoes.filter((x) => x !== c) })}
              >
                {c} ✕
              </button>
            ))}
          </div>
          <div className="acoes">
            <input
              list="condicoes"
              value={condicaoNova}
              onChange={(e) => setCondicaoNova(e.target.value)}
              placeholder="Adicionar condição"
            />
            <datalist id="condicoes">
              {CONDICOES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <button
              disabled={!condicaoNova.trim() || combate.condicoes.includes(condicaoNova.trim())}
              onClick={() => {
                mudarCombate({ condicoes: [...combate.condicoes, condicaoNova.trim()] })
                setCondicaoNova('')
              }}
            >
              Adicionar
            </button>
          </div>
        </div>

        <div className="cartao">
          <h3>Atributos e salvaguardas</h3>
          <table className="tabela">
            <tbody>
              {ATRIBUTOS.map((a) => (
                <tr key={a}>
                  <td>{NOMES_ATRIBUTO[a]}</td>
                  <td>{ficha.atributos[a]}</td>
                  <td>
                    <button
                      className="rolavel"
                      title="Rolar teste de atributo"
                      onClick={() => aoTestar(`${NOMES_ATRIBUTO[a]} (teste)`, modificador(ficha.atributos[a]))}
                    >
                      {formatarBonus(modificador(ficha.atributos[a]))}
                    </button>
                  </td>
                  <td>
                    {ficha.proficiencias.salvaguardas.includes(a) ? '● ' : '○ '}
                    <button
                      className="rolavel"
                      title="Rolar salvaguarda"
                      onClick={() => aoTestar(`${NOMES_ATRIBUTO[a]} (salvaguarda)`, bonusSalvaguarda(ficha, a))}
                    >
                      {formatarBonus(bonusSalvaguarda(ficha, a))}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="cartao">
          <h3>Perícias</h3>
          <table className="tabela">
            <tbody>
              {(Object.keys(PERICIAS) as PericiaId[]).map((id) => {
                const nivel = ficha.proficiencias.pericias[id]
                return (
                  <tr key={id}>
                    <td>{nivel === 'especialista' ? '◆' : nivel ? '●' : '○'}</td>
                    <td>{PERICIAS[id].nome}</td>
                    <td className="suave">{PERICIAS[id].atributo.toUpperCase()}</td>
                    <td>
                      <button
                        className="rolavel"
                        title="Rolar perícia"
                        onClick={() => aoTestar(PERICIAS[id].nome, bonusPericia(ficha, id))}
                      >
                        {formatarBonus(bonusPericia(ficha, id))}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {ficha.ataques.length > 0 && (
          <div className="cartao">
            <h3>Ataques</h3>
            <table className="tabela">
              <tbody>
                {ficha.ataques.map((a, i) => (
                  <tr key={i}>
                    <td>{a.nome}</td>
                    <td>
                      <button className="rolavel" title="Rolar ataque" onClick={() => aoTestar(`${a.nome} (ataque)`, a.bonus)}>
                        {formatarBonus(a.bonus)}
                      </button>
                    </td>
                    <td>
                      <button className="rolavel" title="Rolar dano" onClick={() => aoRolarDano(`${a.nome} (dano)`, a.dano)}>
                        {a.dano}
                      </button>
                      {a.tipoDano && ` ${a.tipoDano}`}
                    </td>
                    <td className="suave">{a.notas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ficha.conjuracao && (
          <div className="cartao">
            <h3>Magias</h3>
            {Object.entries(ficha.conjuracao.espacos).map(([nivel, e]) => (
              <div className="linha" key={nivel}>
                <span>{nivel}º nível</span>
                <span className="circulos">
                  {Array.from({ length: e.total }, (_, i) => (
                    <button
                      key={i}
                      className={`circulo ${i < e.usados ? 'usado' : ''}`}
                      aria-label={`Espaço ${i + 1} do ${nivel}º nível`}
                      onClick={() => alternarEspaco(nivel, i)}
                    />
                  ))}
                </span>
              </div>
            ))}
            {ficha.conjuracao.truques.length > 0 && (
              <p>
                <strong>Truques:</strong> {ficha.conjuracao.truques.join(', ')}
              </p>
            )}
            <ul className="lista">
              {ficha.conjuracao.magias.map((m, i) => (
                <li key={i} className={m.preparada ? '' : 'suave'}>
                  {m.preparada ? '● ' : '○ '}
                  {m.nome} <span className="suave">({m.nivel}º)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ficha.caracteristicas.length > 0 && (
          <div className="cartao">
            <h3>Características</h3>
            {ficha.caracteristicas.map((c, i) => (
              <details key={i}>
                <summary>
                  {c.nome}
                  {c.fonte && <span className="suave"> — {c.fonte}</span>}
                  {c.usosMax !== undefined && (
                    <span className="selo">
                      {c.usosAtuais}/{c.usosMax}
                    </span>
                  )}
                </summary>
                <p>{c.descricao}</p>
                {c.usosMax !== undefined && (
                  <div className="acoes">
                    <button onClick={() => mudarUso(i, -1)}>Usar</button>
                    <button onClick={() => mudarUso(i, 1)}>Recuperar</button>
                  </div>
                )}
              </details>
            ))}
            {ficha.maestriasArmas && (
              <p>
                <strong>Maestrias de armas:</strong> {ficha.maestriasArmas.join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="cartao">
          <h3>Inventário</h3>
          <ul className="lista">
            {ficha.inventario.map((item, i) => (
              <li key={i}>
                {item.equipado ? '⚔ ' : ''}
                {item.nome} {item.quantidade > 1 && <span className="suave">×{item.quantidade}</span>}
              </li>
            ))}
          </ul>
          <div className="moedas">
            {(['pc', 'pp', 'pe', 'po', 'pl'] as const).map((tipo) => (
              <label key={tipo}>
                {tipo.toUpperCase()}
                <input
                  type="number"
                  min={0}
                  value={ficha.moedas[tipo]}
                  onChange={(e) => mudarMoeda(tipo, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Numero({ rotulo, valor, aoClicar }: { rotulo: string; valor: string | number; aoClicar?: () => void }) {
  const conteudo = (
    <>
      <strong>{valor}</strong>
      <span>{rotulo}</span>
    </>
  )
  return aoClicar ? (
    <button className="numero rolavel" title={`Rolar ${rotulo}`} onClick={aoClicar}>
      {conteudo}
    </button>
  ) : (
    <div className="numero">{conteudo}</div>
  )
}

function Marcadores(props: { rotulo: string; total: number; marcados: number; aoMudar: (n: number) => void }) {
  return (
    <span className="linha-inline">
      {props.rotulo}
      {Array.from({ length: props.total }, (_, i) => (
        <button
          key={i}
          className={`circulo ${i < props.marcados ? 'usado' : ''}`}
          aria-label={`${props.rotulo} ${i + 1}`}
          onClick={() => props.aoMudar(i + 1 === props.marcados ? i : i + 1)}
        />
      ))}
    </span>
  )
}
