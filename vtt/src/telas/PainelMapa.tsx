import { useState } from 'react'
import { corDoIndice, posicaoLivre, type Mapa, type Token } from '../lib/mapa'
import { enviarImagem, medirImagem, urlValida } from '../lib/mapaImagem'
import type { Participante } from '../lib/sala'
import MapaVista from './MapaVista'

type Props = {
  codigo: string
  mapa: Mapa
  ehMestre: boolean
  meuId: string
  participantes: Participante[]
  combatentes: { id: string; nome: string; donoId?: string }[] // combatentes do mestre, para criar tokens
  turnoCombatenteId: string | null
  aoMudar: (atualizar: (m: Mapa) => Mapa) => void // só o mestre
  aoMover: (id: string, x: number, y: number) => void
}

const numero = (texto: string, padrao: number) => {
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : padrao
}

export default function PainelMapa({
  codigo,
  mapa,
  ehMestre,
  meuId,
  participantes,
  combatentes,
  turnoCombatenteId,
  aoMudar,
  aoMover,
}: Props) {
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [quadradosNaLargura, setQuadradosNaLargura] = useState(20)
  const [novo, setNovo] = useState({ nome: '', tamanho: 1, donoId: '' })

  const token = mapa.tokens.find((t) => t.id === selecionado)
  const semToken = combatentes.filter((c) => !mapa.tokens.some((t) => t.combatenteId === c.id))
  const jogadores = participantes.filter((p) => p.papel === 'jogador')

  async function definirImagem(endereco: string) {
    setOcupado(true)
    setMensagem('')
    const medida = await medirImagem(endereco)
    setOcupado(false)
    if (!medida) {
      setMensagem('Não consegui abrir essa imagem (endereço errado, bloqueada ou maior que 20.000 px).')
      return
    }
    aoMudar((m) => ({ ...m, imagemUrl: endereco, ...medida }))
  }

  async function aoEscolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return
    setOcupado(true)
    setMensagem('')
    const r = await enviarImagem(codigo, arquivo)
    setOcupado(false)
    if (!r.ok) return setMensagem(r.erro)
    await definirImagem(r.url)
  }

  function criarToken(base: { nome: string; donoId?: string; combatenteId?: string }, tamanho: number) {
    aoMudar((m) => {
      const posicao = posicaoLivre(m, tamanho)
      const t: Token = {
        id: crypto.randomUUID(),
        nome: base.nome.slice(0, 40),
        ...posicao,
        tamanho,
        cor: corDoIndice(m.tokens.length),
        donoId: base.donoId || undefined,
        combatenteId: base.combatenteId,
        oculto: false,
      }
      return { ...m, tokens: [...m.tokens, t] }
    })
  }

  function mudarToken(id: string, mudanca: Partial<Token>) {
    aoMudar((m) => ({ ...m, tokens: m.tokens.map((t) => (t.id === id ? { ...t, ...mudanca } : t)) }))
  }

  return (
    <section className="cartao">
      <h3>Mapa</h3>

      {ehMestre && (
        <details open={!mapa.imagemUrl}>
          <summary>Configurar mapa</summary>

          <div className="form-npc">
            <label>
              Endereço (URL) da imagem
              <input style={{ width: 280 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/mapa.png" />
            </label>
            <button disabled={ocupado || !urlValida(url)} onClick={() => void definirImagem(url)}>
              Usar imagem
            </button>
            <label>
              …ou enviar arquivo
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={ocupado} onChange={(e) => void aoEscolherArquivo(e.target.files?.[0])} />
            </label>
          </div>
          {mensagem && <p className="erro" role="alert">{mensagem}</p>}
          {ocupado && <p className="aviso">Carregando…</p>}

          <div className="form-npc">
            <label>
              Pixels por quadrado
              <input type="number" min={10} max={500} value={mapa.grid.tamanho} onChange={(e) => aoMudar((m) => ({ ...m, grid: { ...m.grid, tamanho: Math.min(500, Math.max(10, numero(e.target.value, 70))) } }))} />
            </label>
            <label>
              Deslocar grade X
              <input type="number" value={mapa.grid.offsetX} onChange={(e) => aoMudar((m) => ({ ...m, grid: { ...m.grid, offsetX: Math.min(1000, Math.max(-1000, numero(e.target.value, 0))) } }))} />
            </label>
            <label>
              Deslocar grade Y
              <input type="number" value={mapa.grid.offsetY} onChange={(e) => aoMudar((m) => ({ ...m, grid: { ...m.grid, offsetY: Math.min(1000, Math.max(-1000, numero(e.target.value, 0))) } }))} />
            </label>
            <label>
              Metros por quadrado
              <input type="number" step="0.1" min={0.1} value={mapa.metrosPorQuadrado} onChange={(e) => aoMudar((m) => ({ ...m, metrosPorQuadrado: Math.min(30, Math.max(0.1, numero(e.target.value, 1.5))) }))} />
            </label>
            <label>
              <span>
                <input type="checkbox" checked={mapa.grid.visivel} onChange={(e) => aoMudar((m) => ({ ...m, grid: { ...m.grid, visivel: e.target.checked } }))} /> Mostrar grade
              </span>
            </label>
          </div>
          <div className="form-npc">
            <label>
              Quadrados na largura da imagem
              <input type="number" min={1} value={quadradosNaLargura} onChange={(e) => setQuadradosNaLargura(Math.max(1, Math.floor(numero(e.target.value, 20))))} />
            </label>
            <button
              onClick={() => aoMudar((m) => ({ ...m, grid: { ...m.grid, tamanho: Math.min(500, Math.max(10, m.largura / quadradosNaLargura)) } }))}
            >
              Calcular tamanho do quadrado
            </button>
          </div>

          <h4>Tokens</h4>
          <div className="form-npc">
            <label>
              Criar de um combatente
              <select
                value=""
                onChange={(e) => {
                  const c = semToken.find((x) => x.id === e.target.value)
                  if (c) criarToken({ nome: c.nome, donoId: c.donoId, combatenteId: c.id }, 1)
                }}
              >
                <option value="">{semToken.length ? 'Escolher…' : 'Todos já têm token'}</option>
                {semToken.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-npc">
            <label>
              Token avulso
              <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} maxLength={40} placeholder="Nome" />
            </label>
            <label>
              Tamanho
              <select value={novo.tamanho} onChange={(e) => setNovo({ ...novo, tamanho: Number(e.target.value) })}>
                <option value={1}>Médio (1)</option>
                <option value={2}>Grande (2)</option>
                <option value={3}>Enorme (3)</option>
                <option value={4}>Imenso (4)</option>
              </select>
            </label>
            <label>
              Dono
              <select value={novo.donoId} onChange={(e) => setNovo({ ...novo, donoId: e.target.value })}>
                <option value="">Só o mestre move</option>
                {jogadores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!novo.nome.trim()}
              onClick={() => {
                criarToken({ nome: novo.nome.trim(), donoId: novo.donoId }, novo.tamanho)
                setNovo({ ...novo, nome: '', donoId: '' }) // não herda o dono no próximo token
              }}
            >
              Adicionar
            </button>
          </div>
        </details>
      )}

      {ehMestre && token && (
        <div className="acoes selecionado">
          <strong>{token.nome}</strong>
          <button onClick={() => mudarToken(token.id, { oculto: !token.oculto })}>{token.oculto ? 'Revelar' : 'Ocultar'}</button>
          <select value={token.tamanho} onChange={(e) => mudarToken(token.id, { tamanho: Number(e.target.value) })} aria-label="Tamanho do token">
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                Tamanho {n}
              </option>
            ))}
          </select>
          <input type="color" value={token.cor} onChange={(e) => mudarToken(token.id, { cor: e.target.value })} aria-label="Cor do token" />
          <button
            onClick={() => {
              aoMudar((m) => ({ ...m, tokens: m.tokens.filter((t) => t.id !== token.id) }))
              setSelecionado(null)
            }}
          >
            Remover
          </button>
        </div>
      )}

      <MapaVista
        mapa={mapa}
        ehMestre={ehMestre}
        meuId={meuId}
        turnoCombatenteId={turnoCombatenteId}
        selecionado={selecionado}
        aoSelecionar={setSelecionado}
        aoMover={aoMover}
      />
    </section>
  )
}
