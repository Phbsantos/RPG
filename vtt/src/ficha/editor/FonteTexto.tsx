import { useRef, useState } from 'react'

const TAMANHO_MAXIMO = 2_000_000

type Props = {
  alvo: string // "classe", "raça", "talento"…: aparece nos rótulos de acessibilidade
  aoTexto: (texto: string, origem: string) => void
  aoErro: (mensagem: string) => void
}

// Três jeitos de trazer o texto de um .md: ler da área de transferência, colar numa caixa ou escolher o arquivo.
// Nada sai do navegador.
export default function FonteTexto({ alvo, aoTexto, aoErro }: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [digitado, setDigitado] = useState('')
  const [aviso, setAviso] = useState('')

  function entregar(texto: string, origem: string) {
    setAviso('')
    if (!texto.trim()) return aoErro('Não há texto para ler.')
    if (texto.length > TAMANHO_MAXIMO) return aoErro('Texto grande demais (máximo 2 MB).')
    aoTexto(texto, origem)
  }

  async function doArquivo(arq: File | undefined) {
    if (entrada.current) entrada.current.value = ''
    if (!arq) return
    if (arq.size > TAMANHO_MAXIMO) return aoErro('Arquivo grande demais (máximo 2 MB).')
    entregar(await arq.text(), arq.name)
  }

  async function daAreaDeTransferencia() {
    try {
      entregar(await navigator.clipboard.readText(), 'área de transferência')
    } catch {
      setAviso('O navegador não deixou ler a área de transferência (precisa de permissão). Cole o texto na caixa abaixo com Ctrl+V.')
    }
  }

  return (
    <div className="fonte-texto">
      <div className="acoes">
        <button type="button" className="pri" onClick={() => void daAreaDeTransferencia()}>
          Colar da área de transferência
        </button>
        <label className="suave">
          ou escolha um arquivo:{' '}
          <input ref={entrada} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" aria-label={`Arquivo de ${alvo}`} onChange={(e) => void doArquivo(e.target.files?.[0])} />
        </label>
      </div>
      {aviso && <p className="aviso-importar" role="status">{aviso}</p>}
      <textarea
        rows={4}
        value={digitado}
        aria-label={`Texto de ${alvo}`}
        placeholder="…ou cole o texto aqui (Ctrl+V). Ele é lido assim que você cola."
        onChange={(e) => setDigitado(e.target.value)}
        onPaste={(e) => {
          const texto = e.clipboardData.getData('text')
          if (!texto.trim()) return
          e.preventDefault()
          entregar(texto, 'texto colado')
        }}
      />
      {digitado.trim() && (
        <button type="button" onClick={() => entregar(digitado, 'texto digitado')}>
          Ler o texto da caixa
        </button>
      )}
    </div>
  )
}
