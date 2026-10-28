import { useEffect, useRef, useState } from 'react'
import { obterId, obterNome, papelNaSala, salvarNome } from '../lib/identidade'
import { useSala, type ResumoPersonagem } from '../lib/sala'
import { chavePublicaDaSala } from '../lib/seguranca'
import { formulaTeste, rolar, totalDe, type ModoD20 } from '../lib/dados'
import { useCombateMestre } from '../lib/combateMestre'
import type { Comando } from '../lib/combate'
import type { Ficha } from '../ficha/esquema'
import { aplicarCura, aplicarDano, iniciativa, resumoClasses } from '../ficha/regras'
import { baixarFicha, carregarRascunho, descartarRascunho, lerArquivoFicha, salvarRascunho } from '../ficha/arquivo'
import FichaVista from '../ficha/FichaVista'
import PainelDados from './PainelDados'
import CombateMestre from './CombateMestre'
import CombateVista from './CombateVista'
import PainelMapa from './PainelMapa'
import Campanha from './Campanha'
import { useMapaMestre } from '../lib/mapaMestre'
import { alinharNaGrade, limitar, novoMapa } from '../lib/mapa'

const MAPA_VAZIO = novoMapa() // identidade estável: o mapa só "muda" quando chega um novo de verdade

type Props = { codigo: string; sair: () => void }

function resumir(f: Ficha): ResumoPersonagem {
  return {
    nome: f.nome,
    classe: resumoClasses(f),
    edicao: f.edicao,
    pv: { atual: f.combate.pv.atual, max: f.combate.pv.max },
    ca: f.combate.ca,
    condicoes: f.combate.condicoes,
  }
}

// Se o jogador chegou pelo link sem nome salvo, pede o nome antes de conectar.
export default function Sala({ codigo, sair }: Props) {
  const [nome, setNome] = useState(obterNome())
  const [rascunho, setRascunho] = useState('')

  if (!nome) {
    return (
      <main className="inicio">
        <h1>Sala {codigo}</h1>
        <label className="campo">
          Seu nome
          <input value={rascunho} onChange={(e) => setRascunho(e.target.value)} maxLength={30} />
        </label>
        <button
          disabled={!rascunho.trim()}
          onClick={() => {
            salvarNome(rascunho)
            setNome(rascunho.trim())
          }}
        >
          Entrar
        </button>
      </main>
    )
  }

  return <SalaConectada codigo={codigo} nome={nome} sair={sair} />
}

function SalaConectada({ codigo, nome, sair }: Props & { nome: string }) {
  const papel = papelNaSala(codigo)
  const ehMestre = papel === 'mestre'
  const meuId = obterId()
  const [ficha, setFicha] = useState<Ficha | null>(carregarRascunho)
  const fichaRef = useRef(ficha)
  useEffect(() => {
    fichaRef.current = ficha
  })
  const [erros, setErros] = useState<string[]>([])
  const [aviso, setAviso] = useState('')
  const entradaArquivo = useRef<HTMLInputElement>(null)
  const [copiado, setCopiado] = useState(false)
  const [modo, setModo] = useState<ModoD20>('normal')
  const [erroDado, setErroDado] = useState('')

  // O mestre pediu para alterar a minha ficha (dano, cura, condição).
  function aoComando(c: Comando) {
    const f = fichaRef.current
    if (!f) {
      setAviso('O mestre tentou alterar sua ficha, mas você ainda não carregou uma.')
      return
    }
    const a = c.acao
    if (a.tipo === 'dano') {
      mudarFicha(aplicarDano(f, a.valor))
      setAviso(`O mestre aplicou ${a.valor} de dano em ${f.nome}.`)
    } else if (a.tipo === 'cura') {
      mudarFicha(aplicarCura(f, a.valor))
      setAviso(`O mestre curou ${a.valor} PV de ${f.nome}.`)
    } else {
      const sem = f.combate.condicoes.filter((x) => x !== a.nome)
      mudarFicha({ ...f, combate: { ...f.combate, condicoes: a.adicionar ? [...sem, a.nome] : sem } })
      setAviso(`${f.nome}: condição "${a.nome}" ${a.adicionar ? 'adicionada' : 'removida'} pelo mestre.`)
    }
  }

  // Um jogador rolou iniciativa: vale só para o PC dele.
  function aoIniciativa(autorId: string, valor: number) {
    setCombate((c) => ({
      ...c,
      combatentes: c.combatentes.map((x) => (x.donoId === autorId && x.iniciativa === null ? { ...x, iniciativa: valor } : x)),
    }))
  }

  // Um jogador arrastou o próprio token: o mestre confere o dono e a grade antes de aceitar.
  function aoJogadorMover(autorId: string, tokenId: string, x: number, y: number) {
    setMapa((m) => {
      const t = m.tokens.find((k) => k.id === tokenId)
      if (!t || t.donoId !== autorId) return m
      const p = alinharNaGrade(limitar(x, m.largura), limitar(y, m.altura), t.tamanho, m.grid)
      return { ...m, tokens: m.tokens.map((k) => (k.id === tokenId ? { ...k, ...p } : k)) }
    })
  }

  const {
    participantes,
    rolagens,
    combate: combatePublico,
    mapa: mapaRecebido,
    status,
    enviarRolagem,
    registrarLocal,
    enviarMestre,
    enviarIniciativa,
    enviarMovimento,
  } = useSala({ codigo, nome, papel, personagem: ficha ? resumir(ficha) : undefined, aoComando, aoIniciativa, aoMover: aoJogadorMover })
  const idsPresentes = participantes.map((p) => p.id).join(',')
  const [combate, setCombate] = useCombateMestre(codigo, ehMestre, status, idsPresentes, enviarMestre)
  const [mapaMestre, setMapa] = useMapaMestre(codigo, ehMestre, status, idsPresentes, enviarMestre)
  const mapa = ehMestre ? mapaMestre : (mapaRecebido ?? MAPA_VAZIO)

  function moverToken(id: string, x: number, y: number) {
    if (ehMestre) setMapa((m) => ({ ...m, tokens: m.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)) }))
    else enviarMovimento(id, x, y)
  }

  function lancar(formula: string, rotulo = '', secreta = false): number | null {
    const r = rolar(formula, { id: meuId, nome: ficha?.nome ?? nome }, rotulo)
    if (!r.ok) {
      setErroDado(r.erro)
      return null
    }
    setErroDado('')
    if (secreta) registrarLocal(r.registro)
    else enviarRolagem(r.registro)
    return totalDe(r.registro.termos)
  }

  function rolarMinhaIniciativa() {
    const total = lancar(formulaTeste(ficha ? iniciativa(ficha) : 0, modo), 'Iniciativa')
    if (total !== null) enviarIniciativa(total)
  }

  async function copiarLink() {
    const chave = chavePublicaDaSala(codigo)
    const link = `${location.origin}${location.pathname}#/sala/${codigo}${chave ? `?k=${chave}` : ''}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      window.prompt('Copie o link:', link)
    }
  }

  async function aoEscolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return
    const r = await lerArquivoFicha(arquivo)
    if (r.ok) {
      setErros([])
      mudarFicha(r.ficha)
    } else {
      setErros(r.erros)
    }
    if (entradaArquivo.current) entradaArquivo.current.value = ''
  }

  function mudarFicha(nova: Ficha) {
    setFicha(nova)
    salvarRascunho(nova)
  }

  function removerFicha() {
    if (!window.confirm('Remover a ficha desta sessão? Baixe o JSON antes se quiser guardar as alterações.')) return
    descartarRascunho()
    setFicha(null)
  }

  return (
    <main className="sala">
      <header>
        <h1>Sala {codigo}</h1>
        <div className="acoes">
          <button onClick={copiarLink}>{copiado ? 'Link copiado!' : 'Copiar link de convite'}</button>
          <button onClick={sair}>Sair</button>
        </div>
      </header>

      <p className={status === 'conectado' ? 'ok' : status === 'erro' ? 'erro' : 'aviso'}>
        {status === 'conectado' && `Conectado como ${papel}.`}
        {status === 'conectando' && 'Conectando…'}
        {status === 'erro' && 'Falha na conexão. Recarregue a página.'}
      </p>

      {aviso && (
        <p className="aviso" role="status">
          {aviso} <button onClick={() => setAviso('')}>OK</button>
        </p>
      )}

      <h2>Na sala ({participantes.length})</h2>
      <ul className="participantes">
        {participantes.map((p) => (
          <li key={p.id}>
            <span>
              {p.nome}
              {p.id === meuId && ' (você)'}
              {p.personagem && (
                <span className="suave">
                  {' '}
                  — {p.personagem.nome}, {p.personagem.classe} · PV {p.personagem.pv.atual}/{p.personagem.pv.max} · CA{' '}
                  {p.personagem.ca} · {p.personagem.edicao}
                </span>
              )}
            </span>
            <span className={`selo ${p.papel}`}>{p.papel === 'mestre' ? 'Mestre' : 'Jogador'}</span>
          </li>
        ))}
      </ul>

      {ehMestre ? (
        <CombateMestre combate={combate} aoMudar={setCombate} participantes={participantes} enviarMestre={enviarMestre} />
      ) : (
        <CombateVista
          combate={combatePublico}
          participantes={participantes}
          meuId={meuId}
          aoRolarIniciativa={rolarMinhaIniciativa}
        />
      )}

      <PainelMapa
        codigo={codigo}
        mapa={mapa}
        ehMestre={ehMestre}
        meuId={meuId}
        participantes={participantes}
        combatentes={combate.combatentes.map((c) => ({ id: c.id, nome: c.nome, donoId: c.donoId }))}
        turnoCombatenteId={ehMestre ? combate.turnoId : (combatePublico?.turnoId ?? null)}
        aoMudar={setMapa}
        aoMover={moverToken}
      />

      {ehMestre && (
        <Campanha
          codigo={codigo}
          combate={combate}
          mapa={mapaMestre}
          aoImportar={(c, m) => {
            setCombate(() => c)
            setMapa(() => m)
          }}
        />
      )}

      <h2>Minha ficha</h2>
      <div className="acoes">
        <input
          ref={entradaArquivo}
          type="file"
          accept=".json,application/json"
          onChange={(e) => void aoEscolherArquivo(e.target.files?.[0])}
        />
        {ficha && <button onClick={() => baixarFicha(ficha)}>Baixar ficha (JSON)</button>}
        {ficha && <button onClick={removerFicha}>Remover</button>}
      </div>
      <p className="suave">
        Sem ficha? Baixe um exemplo:{' '}
        <a href="exemplos/elowen-2014.json" download>
          Elowen (2014)
        </a>{' '}
        ·{' '}
        <a href="exemplos/brann-2024.json" download>
          Brann (2024)
        </a>
      </p>

      {erros.length > 0 && (
        <div className="erro" role="alert">
          <p>Não consegui ler essa ficha:</p>
          <ul>
            {erros.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {erros.length > 8 && <p>…e mais {erros.length - 8} problema(s).</p>}
        </div>
      )}

      <PainelDados
        rolagens={rolagens}
        modo={modo}
        aoMudarModo={setModo}
        ehMestre={ehMestre}
        erro={erroDado}
        aoRolar={(formula, secreta) => void lancar(formula, '', secreta)}
      />

      {ficha && (
        <FichaVista
          ficha={ficha}
          aoMudar={mudarFicha}
          aoTestar={(rotulo, bonus) => void lancar(formulaTeste(bonus, modo), rotulo)}
          aoRolarDano={(rotulo, formula) => void lancar(formula, rotulo)}
        />
      )}
    </main>
  )
}
