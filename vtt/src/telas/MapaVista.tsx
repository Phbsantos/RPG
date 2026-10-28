import { useCallback, useEffect, useRef, useState } from 'react'
import { alinharNaGrade, distanciaEmQuadrados, limitar, type Mapa, type Token } from '../lib/mapa'

type Props = {
  mapa: Mapa
  ehMestre: boolean
  meuId: string
  turnoCombatenteId: string | null
  selecionado: string | null
  aoSelecionar: (id: string | null) => void
  aoMover: (id: string, x: number, y: number) => void
}

type Camera = { x: number; y: number; zoom: number }
type Ponto = { x: number; y: number }
type Acao =
  // "ultimo" é lido ao soltar: o estado do React pode ainda não ter renderizado a última posição.
  | { tipo: 'token'; id: string; dx: number; dy: number; ultimo: Ponto | null }
  | { tipo: 'pan'; inicioTela: Ponto; cameraInicial: Camera }
  | { tipo: 'regua' }

const ZOOM_MIN = 0.1
const ZOOM_MAX = 8

export default function MapaVista({ mapa, ehMestre, meuId, turnoCombatenteId, selecionado, aoSelecionar, aoMover }: Props) {
  const recipienteRef = useRef<HTMLDivElement>(null)
  const acaoRef = useRef<Acao | null>(null)
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const [previa, setPrevia] = useState<{ id: string; x: number; y: number } | null>(null)
  const [regua, setRegua] = useState<{ a: Ponto; b: Ponto } | null>(null)
  const [medindo, setMedindo] = useState(false)

  const pode = (t: Token) => ehMestre || t.donoId === meuId

  const ajustar = useCallback(() => {
    const el = recipienteRef.current
    if (!el) return
    const zoom = Math.min(el.clientWidth / mapa.largura, el.clientHeight / mapa.altura)
    setCamera({ zoom, x: (el.clientWidth - mapa.largura * zoom) / 2, y: (el.clientHeight - mapa.altura * zoom) / 2 })
  }, [mapa.largura, mapa.altura])

  // Enquadra o mapa inteiro quando a imagem (ou o tamanho) muda.
  useEffect(() => {
    ajustar()
  }, [ajustar, mapa.imagemUrl])

  // Chegou um mapa novo (ex.: o mestre confirmou o movimento): descarta a posição provisória.
  useEffect(() => {
    if (acaoRef.current?.tipo !== 'token') setPrevia(null)
  }, [mapa])

  // Zoom com a roda, mantendo fixo o ponto sob o cursor. Precisa de listener não passivo.
  useEffect(() => {
    const el = recipienteRef.current
    if (!el) return
    const aoRolar = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      setCamera((c) => {
        const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, c.zoom * Math.exp(-e.deltaY / 500)))
        const f = zoom / c.zoom
        return { zoom, x: cx - (cx - c.x) * f, y: cy - (cy - c.y) * f }
      })
    }
    el.addEventListener('wheel', aoRolar, { passive: false })
    return () => el.removeEventListener('wheel', aoRolar)
  }, [])

  function emTela(e: React.PointerEvent): Ponto {
    const rect = recipienteRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const paraMapa = (p: Ponto): Ponto => ({ x: (p.x - camera.x) / camera.zoom, y: (p.y - camera.y) / camera.zoom })

  function aoApertarFundo(e: React.PointerEvent) {
    recipienteRef.current?.setPointerCapture(e.pointerId)
    const tela = emTela(e)
    if (medindo) {
      const p = paraMapa(tela)
      acaoRef.current = { tipo: 'regua' }
      setRegua({ a: p, b: p })
    } else {
      aoSelecionar(null)
      acaoRef.current = { tipo: 'pan', inicioTela: tela, cameraInicial: camera }
    }
  }

  function aoApertarToken(e: React.PointerEvent, t: Token) {
    if (medindo) return // com a régua ligada, o clique vai para o fundo
    e.stopPropagation()
    aoSelecionar(t.id)
    if (!pode(t)) return
    recipienteRef.current?.setPointerCapture(e.pointerId)
    const p = paraMapa(emTela(e))
    acaoRef.current = { tipo: 'token', id: t.id, dx: t.x - p.x, dy: t.y - p.y, ultimo: null }
  }

  function aoMoverPonteiro(e: React.PointerEvent) {
    const acao = acaoRef.current
    if (!acao) return
    const tela = emTela(e)
    if (acao.tipo === 'pan') {
      setCamera({
        ...acao.cameraInicial,
        x: acao.cameraInicial.x + tela.x - acao.inicioTela.x,
        y: acao.cameraInicial.y + tela.y - acao.inicioTela.y,
      })
    } else if (acao.tipo === 'regua') {
      const p = paraMapa(tela)
      setRegua((r) => (r ? { ...r, b: p } : r))
    } else {
      const p = paraMapa(tela)
      acao.ultimo = { x: p.x + acao.dx, y: p.y + acao.dy }
      setPrevia({ id: acao.id, ...acao.ultimo })
    }
  }

  function aoSoltar() {
    const acao = acaoRef.current
    acaoRef.current = null
    if (acao?.tipo !== 'token' || !acao.ultimo) {
      setPrevia(null)
      return
    }
    const token = mapa.tokens.find((t) => t.id === acao.id)
    if (!token) return setPrevia(null)
    const alvo = alinharNaGrade(
      limitar(acao.ultimo.x, mapa.largura),
      limitar(acao.ultimo.y, mapa.altura),
      token.tamanho,
      mapa.grid,
    )
    setPrevia({ id: token.id, ...alvo }) // fica onde soltou até o mapa confirmado chegar
    aoMover(token.id, alvo.x, alvo.y)
    setTimeout(() => setPrevia((p) => (p?.id === token.id ? null : p)), 2000)
  }

  const g = mapa.grid
  const quadrados = regua ? distanciaEmQuadrados(regua.a, regua.b, g) : 0

  return (
    <div className="mapa">
      <div className="acoes">
        <button onClick={ajustar}>Ajustar à tela</button>
        <button onClick={() => setCamera((c) => ({ ...c, zoom: Math.min(ZOOM_MAX, c.zoom * 1.25) }))}>+</button>
        <button onClick={() => setCamera((c) => ({ ...c, zoom: Math.max(ZOOM_MIN, c.zoom / 1.25) }))}>−</button>
        <button
          aria-pressed={medindo}
          className={medindo ? 'ativo' : ''}
          onClick={() => {
            setMedindo(!medindo)
            setRegua(null)
          }}
        >
          Régua {medindo ? '(ligada)' : ''}
        </button>
      </div>

      <div
        ref={recipienteRef}
        className={`mapa-area ${medindo ? 'medindo' : ''}`}
        onPointerMove={aoMoverPonteiro}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        <svg width="100%" height="100%" onPointerDown={aoApertarFundo}>
          <defs>
            <pattern id="grade" width={g.tamanho} height={g.tamanho} patternUnits="userSpaceOnUse" x={g.offsetX} y={g.offsetY}>
              <path d={`M ${g.tamanho} 0 L 0 0 0 ${g.tamanho}`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1 / camera.zoom} />
            </pattern>
          </defs>
          <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
            <rect width={mapa.largura} height={mapa.altura} fill="#2a2d35" />
            {mapa.imagemUrl && (
              <image href={mapa.imagemUrl} width={mapa.largura} height={mapa.altura} preserveAspectRatio="none" />
            )}
            {g.visivel && <rect width={mapa.largura} height={mapa.altura} fill="url(#grade)" pointerEvents="none" />}

            {mapa.tokens.map((t) => {
              const posicao = previa?.id === t.id ? previa : t
              const raio = (t.tamanho * g.tamanho) / 2 - 3
              const doTurno = turnoCombatenteId !== null && t.combatenteId === turnoCombatenteId
              return (
                <g
                  key={t.id}
                  transform={`translate(${posicao.x} ${posicao.y})`}
                  onPointerDown={(e) => aoApertarToken(e, t)}
                  style={{ cursor: pode(t) ? 'grab' : 'pointer' }}
                  opacity={t.oculto ? 0.5 : 1}
                >
                  <circle
                    r={raio}
                    fill={t.cor}
                    stroke={doTurno ? '#ffd23f' : selecionado === t.id ? '#fff' : '#000'}
                    strokeWidth={doTurno ? 6 : selecionado === t.id ? 4 : 2}
                    strokeDasharray={t.oculto ? '8 6' : undefined}
                  />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={raio * 0.9} fill="#fff" stroke="#000" strokeWidth={raio * 0.05} paintOrder="stroke" pointerEvents="none">
                    {t.nome.slice(0, 2).toUpperCase()}
                  </text>
                  <text y={raio + g.tamanho * 0.28} textAnchor="middle" fontSize={g.tamanho * 0.24} fill="#fff" stroke="#000" strokeWidth={g.tamanho * 0.05} paintOrder="stroke" pointerEvents="none">
                    {t.nome}
                  </text>
                </g>
              )
            })}

            {regua && (
              <g pointerEvents="none">
                <line x1={regua.a.x} y1={regua.a.y} x2={regua.b.x} y2={regua.b.y} stroke="#ffd23f" strokeWidth={3 / camera.zoom} strokeDasharray={`${8 / camera.zoom} ${6 / camera.zoom}`} />
                <circle cx={regua.a.x} cy={regua.a.y} r={5 / camera.zoom} fill="#ffd23f" />
                <text
                  x={(regua.a.x + regua.b.x) / 2}
                  y={(regua.a.y + regua.b.y) / 2 - 10 / camera.zoom}
                  textAnchor="middle"
                  fontSize={16 / camera.zoom}
                  fill="#ffd23f"
                  stroke="#000"
                  strokeWidth={3 / camera.zoom}
                  paintOrder="stroke"
                >
                  {quadrados} quadrados · {(quadrados * mapa.metrosPorQuadrado).toFixed(1).replace('.', ',')} m
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>
      <p className="suave">Arraste o fundo para mover a vista, use a roda para dar zoom e arraste seus tokens para movê-los.</p>
    </div>
  )
}
