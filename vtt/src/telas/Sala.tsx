import { useRef, useState } from 'react'
import { obterId, obterNome, papelNaSala, salvarNome } from '../lib/identidade'
import { useSala, type ResumoPersonagem } from '../lib/sala'
import type { Ficha } from '../ficha/esquema'
import { resumoClasses } from '../ficha/regras'
import { baixarFicha, carregarRascunho, descartarRascunho, lerArquivoFicha, salvarRascunho } from '../ficha/arquivo'
import FichaVista from '../ficha/FichaVista'

type Props = { codigo: string; sair: () => void }

function resumir(f: Ficha): ResumoPersonagem {
  return {
    nome: f.nome,
    classe: resumoClasses(f),
    edicao: f.edicao,
    pv: { atual: f.combate.pv.atual, max: f.combate.pv.max },
    ca: f.combate.ca,
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
  const [ficha, setFicha] = useState<Ficha | null>(carregarRascunho)
  const [erros, setErros] = useState<string[]>([])
  const entradaArquivo = useRef<HTMLInputElement>(null)
  const { participantes, status } = useSala(codigo, nome, papel, ficha ? resumir(ficha) : undefined)
  const [copiado, setCopiado] = useState(false)
  const meuId = obterId()

  async function copiarLink() {
    const link = `${location.origin}${location.pathname}#/sala/${codigo}`
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

      {ficha && <FichaVista ficha={ficha} aoMudar={mudarFicha} />}
    </main>
  )
}
