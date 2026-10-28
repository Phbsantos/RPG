import { useState } from 'react'
import type { Ficha } from '../ficha/esquema'
import { baixarFicha, carregarRascunho, salvarRascunho } from '../ficha/arquivo'
import { fichaNova, gravarRascunhoEditor, lerRascunhoEditor, limparRascunhoEditor } from '../ficha/novaFicha'
import EditorFicha from '../ficha/EditorFicha'

type Props = { voltar: () => void }

// Página própria do editor (fora de uma sala): a ficha salva aqui é carregada sozinha ao entrar numa sala.
export default function PaginaPersonagem({ voltar }: Props) {
  const [base, setBase] = useState<Ficha>(() => lerRascunhoEditor() ?? carregarRascunho() ?? fichaNova())
  const [salva, setSalva] = useState<Ficha | null>(null)

  if (salva) {
    return (
      <main className="entrada">
        <div className="entrada-conteudo">
          <section className="opcao" style={{ maxWidth: 560, margin: '0 auto' }}>
            <span className="opcao-icone" aria-hidden="true">✅</span>
            <h2>Ficha salva</h2>
            <p>
              <strong>{salva.nome}</strong> foi salva neste navegador e será carregada sozinha quando você entrar em uma sala.
              Baixe o JSON para guardar uma cópia ou enviar a outro dispositivo.
            </p>
            <div className="acoes">
              <button className="pri" onClick={() => baixarFicha(salva)}>Baixar JSON</button>
              <button
                onClick={() => {
                  setBase(salva)
                  setSalva(null)
                }}
              >
                Continuar editando
              </button>
              <button onClick={voltar}>Voltar ao início</button>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="editor-pagina">
      <EditorFicha
        inicial={base}
        titulo="Criar ou editar personagem"
        aoMudar={gravarRascunhoEditor}
        aoCancelar={voltar}
        aoSalvar={(f) => {
          salvarRascunho(f) // é a ficha que a sala carrega
          limparRascunhoEditor()
          setSalva(f)
        }}
      />
    </main>
  )
}
