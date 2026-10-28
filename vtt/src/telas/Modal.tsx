import { useEffect, type ReactNode } from 'react'

type Props = { aoFechar: () => void; children: ReactNode }

export default function Modal({ aoFechar, children }: Props) {
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [aoFechar])

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <button onClick={aoFechar}>Fechar ✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
