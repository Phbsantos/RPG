import { useState } from 'react'
import { esquecerSala, marcarComoMestre, obterNome, salasDoMestre, salvarNome } from '../lib/identidade'
import { gerarCodigo, normalizarCodigo, TAMANHO_CODIGO } from '../lib/sala'
import { criarChavesDeMestre } from '../lib/seguranca'

type Props = { irParaSala: (codigo: string) => void; irParaEditor: () => void }

const RECURSOS = ['⚔️ Combate e iniciativa', '🗺️ Mapa com tokens', '🎲 Dados compartilhados', '📜 Fichas em JSON', '📖 Bestiário do SRD']

export default function Inicio({ irParaSala, irParaEditor }: Props) {
  const [nome, setNome] = useState(obterNome())
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [anteriores, setAnteriores] = useState(() => salasDoMestre().slice(0, 4))

  const nomeValido = nome.trim().length > 0
  const codigoValido = codigo.length === TAMANHO_CODIGO

  async function criarSala() {
    setErro('')
    setOcupado(true)
    try {
      const novo = gerarCodigo()
      salvarNome(nome)
      await criarChavesDeMestre(novo) // a chave do mestre é criada junto com a sala
      marcarComoMestre(novo)
      irParaSala(novo)
    } catch {
      setErro('Não foi possível criar a sala neste navegador. Tente abrir o site em uma janela normal (não privada).')
      setOcupado(false)
    }
  }

  function entrarNaSala() {
    salvarNome(nome)
    irParaSala(codigo)
  }

  function retomar(sala: string) {
    salvarNome(nome)
    irParaSala(sala)
  }

  return (
    <main className="entrada">
      <div className="entrada-conteudo">
        <header className="hero">
          <span className="emblema" aria-hidden="true">⚔</span>
          <h1>
            Mesa Virtual <em>D&amp;D</em>
          </h1>
          <p>Combate, mapa e fichas para jogar online com os seus amigos, nas edições 2014 e 2024.</p>
          <ul className="recursos">
            {RECURSOS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </header>

        <section className="cartao-nome">
          <label htmlFor="nome-jogador">Seu nome</label>
          <input
            id="nome-jogador"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={30}
            placeholder="Como os outros vão te ver na mesa"
            autoComplete="nickname"
            autoFocus={!nome}
          />
        </section>

        <div className="opcoes">
          <section className="opcao mestre">
            <span className="opcao-icone" aria-hidden="true">👑</span>
            <h2>Sou o mestre</h2>
            <p>Crie uma sala e convide os jogadores com um link. Você controla o combate, o mapa e os monstros.</p>
            <button className="pri grande" disabled={!nomeValido || ocupado} onClick={() => void criarSala()}>
              {ocupado ? 'Criando…' : 'Criar sala'}
            </button>
            {anteriores.length > 0 && (
              <div className="retomar">
                <small>Retomar uma sala sua</small>
                <div className="acoes">
                  {anteriores.map((s) => (
                    <span key={s} className="sala-anterior">
                      <button disabled={!nomeValido} onClick={() => retomar(s)} title="Reabrir esta sala com o combate e o mapa salvos">
                        {s}
                      </button>
                      <button
                        className="esquecer"
                        aria-label={`Esquecer a sala ${s}`}
                        title="Apagar esta sala deste navegador"
                        onClick={() => {
                          if (!confirm(`Apagar a sala ${s} deste navegador?\n\nO combate, o mapa e a chave de mestre dela serão perdidos e você não poderá mais ser o mestre dessa sala.`)) return
                          esquecerSala(s)
                          setAnteriores(salasDoMestre().slice(0, 4))
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <form
            className="opcao jogador"
            onSubmit={(e) => {
              e.preventDefault()
              if (nomeValido && codigoValido) entrarNaSala()
            }}
          >
            <span className="opcao-icone" aria-hidden="true">🎲</span>
            <h2>Sou jogador</h2>
            <p>Recebeu um link do mestre? Basta abri-lo. Se tiver só o código, digite abaixo.</p>
            <label htmlFor="codigo-sala">Código da sala</label>
            <input
              id="codigo-sala"
              className="codigo"
              value={codigo}
              onChange={(e) => setCodigo(normalizarCodigo(e.target.value).slice(0, TAMANHO_CODIGO))}
              placeholder="ABC123"
              autoComplete="off"
              spellCheck={false}
            />
            <small className="suave">
              {codigo.length}/{TAMANHO_CODIGO} caracteres. Prefira o link: ele garante que você fala com o mestre certo.
            </small>
            <button type="submit" className="grande" disabled={!nomeValido || !codigoValido}>
              Entrar na sala
            </button>
          </form>
        </div>

        <section className="atalho-ficha">
          <span>Ainda sem ficha?</span>
          <button
            onClick={() => {
              if (nomeValido) salvarNome(nome) // o nome não se perde ao ir e voltar do editor
              irParaEditor()
            }}
          >
            📝 Criar ou editar um personagem
          </button>
        </section>

        {!nomeValido && <p className="aviso dica">Digite o seu nome para liberar os botões.</p>}
        {erro && <p className="erro dica" role="alert">{erro}</p>}

        <footer className="rodape">
          O combate e o mapa ficam salvos no navegador do mestre. Faça um backup na aba Campanha. Conteúdo do SRD 5.1 e 5.2 da
          Wizards of the Coast, sob licença CC-BY 4.0.
        </footer>
      </div>
    </main>
  )
}
