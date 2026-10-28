import { useState } from 'react'
import { corDoIndice, posicaoLivre, type Mapa, type Token } from '../lib/mapa'
import { enviarImagem, medirImagem, urlValida } from '../lib/mapaImagem'
import type { Participante } from '../lib/sala'

type Props = {
  codigo: string
  mapa: Mapa
  participantes: Participante[]
  combatentes: { id: string; nome: string; donoId?: string; oculto?: boolean }[] // combatentes do mestre, para criar tokens
  aoMudar: (atualizar: (m: Mapa) => Mapa) => void
}

const numero = (texto: string, padrao: number) => {
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : padrao
}

// Configuração do mapa (aba "Mapa" do mestre): imagem, grade e criação de tokens.
export default function MapaConfig({ codigo, mapa, participantes, combatentes, aoMudar }: Props) {
  const [url, setUrl] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [quadradosNaLargura, setQuadradosNaLargura] = useState(20)
  const [novo, setNovo] = useState({ nome: '', tamanho: 1, donoId: '', oculto: false })

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

  function criarToken(base: { nome: string; donoId?: string; combatenteId?: string; oculto?: boolean }, tamanho: number) {
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
        oculto: base.oculto ?? false, // nasce oculto se for de um combatente oculto ou se marcado
      }
      return { ...m, tokens: [...m.tokens, t] }
    })
  }

  return (
    <section className="cartao">
      <h3>Imagem do mapa</h3>
      <div className="form-npc">
        <label>
          Endereço (URL) da imagem
          <input style={{ width: 220 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/mapa.png" />
        </label>
        <button disabled={ocupado || !urlValida(url)} onClick={() => void definirImagem(url)}>
          Usar imagem
        </button>
      </div>
      <div className="form-npc">
        <label>
          …ou enviar arquivo
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={ocupado} onChange={(e) => void aoEscolherArquivo(e.target.files?.[0])} />
        </label>
      </div>
      {mensagem && <p className="erro" role="alert">{mensagem}</p>}
      {ocupado && <p className="aviso">Carregando…</p>}

      <h3 style={{ marginTop: 18 }}>Grade</h3>
      <div className="form-npc">
        <label>
          Pixels por quadrado
          <input type="number" min={10} max={500} value={mapa.grid.tamanho} onChange={(e) => aoMudar((m) => ({ ...m, grid: { ...m.grid, tamanho: Math.min(500, Math.max(10, numero(e.target.value, 70))) } }))} />
        </label>
        <label>
          Deslocar X
          <input type="number" value={mapa.grid.offsetX} onChange={(e) => aoMudar((m) => ({ ...m, grid: { ...m.grid, offsetX: Math.min(1000, Math.max(-1000, numero(e.target.value, 0))) } }))} />
        </label>
        <label>
          Deslocar Y
          <input type="number" value={mapa.grid.offsetY} onChange={(e) => aoMudar((m) => ({ ...m, grid: { ...m.grid, offsetY: Math.min(1000, Math.max(-1000, numero(e.target.value, 0))) } }))} />
        </label>
        <label>
          Metros por quadrado
          <input type="number" step="0.1" min={0.1} value={mapa.metrosPorQuadrado} onChange={(e) => aoMudar((m) => ({ ...m, metrosPorQuadrado: Math.min(30, Math.max(0.1, numero(e.target.value, 1.5))) }))} />
        </label>
      </div>
      <label>
        <input type="checkbox" checked={mapa.grid.visivel} onChange={(e) => aoMudar((m) => ({ ...m, grid: { ...m.grid, visivel: e.target.checked } }))} /> Mostrar grade
      </label>
      <div className="form-npc">
        <label>
          Quadrados na largura da imagem
          <input type="number" min={1} value={quadradosNaLargura} onChange={(e) => setQuadradosNaLargura(Math.max(1, Math.floor(numero(e.target.value, 20))))} />
        </label>
        <button onClick={() => aoMudar((m) => ({ ...m, grid: { ...m.grid, tamanho: Math.min(500, Math.max(10, m.largura / quadradosNaLargura)) } }))}>
          Calcular quadrado
        </button>
      </div>

      <h3 style={{ marginTop: 18 }}>Tokens</h3>
      <div className="form-npc">
        <label>
          Criar de um combatente
          <select
            value=""
            onChange={(e) => {
              const c = semToken.find((x) => x.id === e.target.value)
              if (c) criarToken({ nome: c.nome, donoId: c.donoId, combatenteId: c.id, oculto: c.oculto }, 1)
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
        <label className="ed-check">
          <input type="checkbox" checked={novo.oculto} onChange={(e) => setNovo({ ...novo, oculto: e.target.checked })} /> Criar oculto
        </label>
        <button
          disabled={!novo.nome.trim()}
          onClick={() => {
            criarToken({ nome: novo.nome.trim(), donoId: novo.donoId, oculto: novo.oculto }, novo.tamanho)
            setNovo({ ...novo, nome: '', donoId: '' }) // não herda o dono no próximo token
          }}
        >
          Adicionar
        </button>
      </div>
      <p className="suave">Clique num token no mapa para ocultar, redimensionar ou remover.</p>
    </section>
  )
}
