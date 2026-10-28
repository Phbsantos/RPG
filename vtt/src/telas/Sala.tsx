import { useCallback, useEffect, useRef, useState } from 'react'
import { obterId, obterNome, papelNaSala, salvarNome } from '../lib/identidade'
import { useSala, type ResumoPersonagem } from '../lib/sala'
import { chavePublicaDaSala } from '../lib/seguranca'
import { formulaTeste, rolar, totalDe, type ModoD20 } from '../lib/dados'
import { useCombateMestre } from '../lib/combateMestre'
import { proximoTurno, type Comando } from '../lib/combate'
import { useMapaMestre } from '../lib/mapaMestre'
import { alinharNaGrade, limitar, novoMapa } from '../lib/mapa'
import type { Ficha } from '../ficha/esquema'
import { aplicarCura, aplicarDano, iniciativa, resumoClasses } from '../ficha/regras'
import { baixarFicha, carregarRascunho, descartarRascunho, lerArquivoFicha, salvarRascunho } from '../ficha/arquivo'
import FichaVista from '../ficha/FichaVista'
import BlocoFicha from '../ficha/BlocoFicha'
import BarraFicha from '../ficha/BarraFicha'
import PainelDados from './PainelDados'
import CombateMestre from './CombateMestre'
import CombateVista from './CombateVista'
import MapaVista from './MapaVista'
import MapaConfig from './MapaConfig'
import BarraToken from './BarraToken'
import Campanha from './Campanha'
import Grupo from './Grupo'
import Modal from './Modal'

type Props = { codigo: string; sair: () => void }
type Aba = 'combate' | 'grupo' | 'mapa' | 'campanha'

const MAPA_VAZIO = novoMapa() // identidade estável: o mapa só "muda" quando chega um novo de verdade

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
          className="pri"
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

const ABAS: { id: Aba; icone: string; titulo: string; soMestre?: boolean }[] = [
  { id: 'combate', icone: '⚔️', titulo: 'Combate' },
  { id: 'grupo', icone: '👥', titulo: 'Grupo' },
  { id: 'mapa', icone: '🗺️', titulo: 'Mapa', soMestre: true },
  { id: 'campanha', icone: '💾', titulo: 'Campanha', soMestre: true },
]

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
  const [copiado, setCopiado] = useState(false)
  const [modo, setModo] = useState<ModoD20>('normal')
  const [erroDado, setErroDado] = useState('')
  const [aba, setAba] = useState<Aba>('combate')
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [fichaAberta, setFichaAberta] = useState(false)

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

  const aoTestar = (rotulo: string, bonus: number) => void lancar(formulaTeste(bonus, modo), rotulo)
  const aoRolarDano = (rotulo: string, formula: string) => void lancar(formula, rotulo)

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
  }

  function mudarFicha(nova: Ficha) {
    setFicha(nova)
    salvarRascunho(nova)
  }

  function removerFicha() {
    if (!window.confirm('Remover a ficha desta sessão? Baixe o JSON antes se quiser guardar as alterações.')) return
    descartarRascunho()
    setFicha(null)
    setFichaAberta(false)
  }

  const fecharFicha = useCallback(() => setFichaAberta(false), [])

  // Quem está com a vez, para o aviso sobre o mapa.
  const turnoId = ehMestre ? combate.turnoId : (combatePublico?.turnoId ?? null)
  const emAndamento = ehMestre ? combate.ativo : Boolean(combatePublico?.ativo)
  const combatenteDoTurno = ehMestre
    ? combate.combatentes.find((c) => c.id === turnoId)
    : combatePublico?.combatentes.find((c) => c.id === turnoId)
  const minhaVez = !ehMestre && combatenteDoTurno?.donoId === meuId
  const tokenSelecionado = mapa.tokens.find((t) => t.id === selecionado)
  const abas = ABAS.filter((a) => !a.soMestre || ehMestre)

  return (
    <div className="shell">
      <header className="topo">
        <div className="logo">
          ⚔ Mesa Virtual <b>D&amp;D</b>
        </div>
        <span className="pilula">
          Sala <b>{codigo}</b>
        </span>
        <span className={`pilula ${status}`}>
          {status === 'conectado' && `● Conectado como ${papel}`}
          {status === 'conectando' && '● Conectando…'}
          {status === 'erro' && '● Falha na conexão: recarregue a página'}
        </span>
        <span className="pilula">👥 {participantes.length} online</span>
        <div className="esp" />
        <button onClick={copiarLink}>{copiado ? 'Link copiado!' : 'Copiar link de convite'}</button>
        <button onClick={sair}>Sair</button>
        {ehMestre && emAndamento && (
          <button className="pri" onClick={() => setCombate(proximoTurno)}>
            Próximo turno ▶
          </button>
        )}
      </header>

      <nav className="trilho" role="tablist" aria-label="Painéis">
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            aria-label={a.titulo}
            title={a.titulo}
            className={aba === a.id ? 'on' : ''}
            onClick={() => setAba(a.id)}
          >
            {a.icone}
          </button>
        ))}
      </nav>

      <aside className="esq">
        {aba === 'combate' &&
          (ehMestre ? (
            <CombateMestre combate={combate} aoMudar={setCombate} participantes={participantes} enviarMestre={enviarMestre} />
          ) : (
            <CombateVista combate={combatePublico} participantes={participantes} meuId={meuId} aoRolarIniciativa={rolarMinhaIniciativa} />
          ))}
        {aba === 'grupo' && <Grupo participantes={participantes} meuId={meuId} />}
        {aba === 'mapa' && ehMestre && (
          <MapaConfig
            codigo={codigo}
            mapa={mapaMestre}
            participantes={participantes}
            combatentes={combate.combatentes.map((c) => ({ id: c.id, nome: c.nome, donoId: c.donoId }))}
            aoMudar={setMapa}
          />
        )}
        {aba === 'campanha' && ehMestre && (
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
      </aside>

      <main className="palco">
        <MapaVista
          mapa={mapa}
          ehMestre={ehMestre}
          meuId={meuId}
          turnoCombatenteId={turnoId}
          selecionado={selecionado}
          aoSelecionar={setSelecionado}
          aoMover={moverToken}
        />

        <div className="palco-topo">
          {emAndamento && combatenteDoTurno && (
            <div className="banner">{minhaVez ? '▶ Sua vez!' : `▶ Vez de ${combatenteDoTurno.nome}`}</div>
          )}
          {ehMestre && tokenSelecionado && (
            <BarraToken token={tokenSelecionado} aoMudarMapa={setMapa} aoDesselecionar={() => setSelecionado(null)} />
          )}
          {aviso && (
            <div className="toast" role="status">
              {aviso} <button onClick={() => setAviso('')}>OK</button>
            </div>
          )}
        </div>

        {ficha && (
          <BarraFicha ficha={ficha} aoMudar={mudarFicha} aoTestar={aoTestar} aoRolarDano={aoRolarDano} aoAbrir={() => setFichaAberta(true)} />
        )}
      </main>

      <aside className="dir">
        <PainelDados
          rolagens={rolagens}
          modo={modo}
          aoMudarModo={setModo}
          ehMestre={ehMestre}
          erro={erroDado}
          aoRolar={(formula, secreta) => void lancar(formula, '', secreta)}
        />
        <BlocoFicha
          ficha={ficha}
          erros={erros}
          aoTestar={aoTestar}
          aoAbrir={() => setFichaAberta(true)}
          aoBaixar={() => ficha && baixarFicha(ficha)}
          aoRemover={removerFicha}
          aoArquivo={(f) => void aoEscolherArquivo(f)}
        />
      </aside>

      {fichaAberta && ficha && (
        <Modal aoFechar={fecharFicha}>
          <FichaVista ficha={ficha} aoMudar={mudarFicha} aoTestar={aoTestar} aoRolarDano={aoRolarDano} />
        </Modal>
      )}
    </div>
  )
}
