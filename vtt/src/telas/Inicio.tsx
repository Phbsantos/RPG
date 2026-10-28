import { useState } from 'react'
import { marcarComoMestre, obterNome, salvarNome } from '../lib/identidade'
import { gerarCodigo, normalizarCodigo, TAMANHO_CODIGO } from '../lib/sala'
import { criarChavesDeMestre } from '../lib/seguranca'

type Props = { irParaSala: (codigo: string) => void }

export default function Inicio({ irParaSala }: Props) {
  const [nome, setNome] = useState(obterNome())
  const [codigo, setCodigo] = useState('')

  const nomeValido = nome.trim().length > 0
  const codigoValido = codigo.length === TAMANHO_CODIGO

  async function criarSala() {
    const novo = gerarCodigo()
    salvarNome(nome)
    await criarChavesDeMestre(novo) // a chave do mestre é criada junto com a sala
    marcarComoMestre(novo)
    irParaSala(novo)
  }

  function entrarNaSala() {
    salvarNome(nome)
    irParaSala(codigo)
  }

  return (
    <main className="inicio">
      <h1>Mesa Virtual de D&amp;D</h1>
      <p>Suporte às edições 2014 e 2024.</p>

      <label className="campo">
        Seu nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={30} />
      </label>

      <section className="bloco">
        <h2>Sou o mestre</h2>
        <button disabled={!nomeValido} onClick={() => void criarSala()}>
          Criar sala
        </button>
      </section>

      <section className="bloco">
        <h2>Sou jogador</h2>
        <label className="campo">
          Código da sala
          <input
            value={codigo}
            onChange={(e) => setCodigo(normalizarCodigo(e.target.value).slice(0, TAMANHO_CODIGO))}
            placeholder="ABC123"
          />
        </label>
        <button disabled={!nomeValido || !codigoValido} onClick={entrarNaSala}>
          Entrar na sala
        </button>
      </section>
    </main>
  )
}
