# Mesa Virtual de D&D

Mesa virtual (VTT) para jogar D&D online, nas edições **2014** e **2024**. O mestre gerencia combate e mapa;
cada jogador sobe o JSON da própria ficha e joga pelo navegador. Interface em português.

## O que tem

- **Salas** por código ou link de convite, com lista de quem está online
- **Fichas** em JSON ([formato](docs/ESQUEMA-FICHA.md)): PV, espaços de magia, recursos, condições, descansos, upload e download
- **Dados** com fórmulas (`2d6+3`, `2d20kh1`), vantagem/desvantagem, histórico compartilhado, rolagem secreta do mestre e rolagem direto da ficha
- **Combate**: iniciativa, turnos, rodadas, NPCs, dano/cura/condições (aplicados na ficha do jogador)
- **Bestiário** do SRD 5.1 (2014) e 5.2 (2024)
- **Mapa**: imagem de fundo, grade, zoom, tokens, régua, tokens ocultos
- **Backup** da campanha do mestre (combate + mapa) em JSON

## Como jogar

1. O mestre abre o site, informa o nome e clica em **Criar sala**.
2. Copia o **link de convite** e envia aos jogadores. Use sempre o link (e não só o código): ele leva a chave que autentica o mestre.
3. Cada jogador entra, informa o nome e carrega o JSON da ficha (há exemplos na própria tela).
4. O mestre configura o mapa, adiciona os jogadores e os monstros ao combate e inicia.

> O combate e o mapa ficam salvos **no navegador do mestre**. Use **Exportar campanha** para ter backup,
> e não troque de navegador nem limpe os dados do site no meio da campanha.

## Rodar no seu computador

Requisitos: Node.js 20 ou superior.

```
npm install
cp .env.example .env     # preencha com os dados do seu projeto Supabase
npm run dev
```

Variáveis (arquivo `.env`, que não vai para o Git):

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | chave **publishable** (nunca a `secret`/`service_role`) |

Outros comandos: `npm run build` (compila e confere os tipos), `npm run lint`.

## Supabase

Usa apenas o **Realtime** (já vem ativo): presença, dados, combate e mapa trafegam por um canal por sala, sem tabelas.
Para enviar imagens de mapa como arquivo, crie o bucket seguindo [docs/SUPABASE.md](docs/SUPABASE.md).
Sem isso o mapa por URL continua funcionando.

## Publicar na Vercel

1. Importe o repositório do GitHub pela Vercel (*Add New → Project*).
2. Em **Root Directory**, use `vtt` (o projeto fica nessa subpasta). O resto vem do [vercel.json](vercel.json):
   instalação com `npm ci`, build com `npm run build`, saída em `dist`.
3. **Não precisa cadastrar variáveis de ambiente.** A URL e a chave *publishable* do Supabase (públicas por desenho)
   ficam em [.env.production](.env.production) e são embutidas no build. Se cadastrar `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` no painel, elas têm prioridade (útil para apontar para outro projeto Supabase).
   Nunca coloque a chave `secret`/`service_role` em nenhum dos dois lugares.
4. A cada `git push` na `main`, a Vercel publica sozinha.

O [vercel.json](vercel.json) também define os cabeçalhos de segurança, com uma política de conteúdo (CSP) que só permite
conexões com o próprio site e com `*.supabase.co`, e cache longo para os arquivos com hash.
Consequência: **mapas por URL só funcionam com endereços `https://`** (imagens `http://` são bloqueadas pelo navegador).

### Conferência depois do deploy

1. Abra o site: a tela inicial deve aparecer (sem o aviso "Supabase não configurado").
2. Crie uma sala, abra o link de convite em outra janela anônima e confirme que os dois se enxergam ("2 online").
3. No painel do Supabase, em **Realtime → Inspector** ou **Reports**, dá para acompanhar o uso do plano gratuito.

## Segurança e limites

- O mestre assina o combate e o mapa com uma chave criada na sala; jogadores só aceitam mensagens com essa assinatura.
  O mestre fica ligado ao navegador onde criou a sala.
- Jogadores nunca recebem o PV exato de monstros, nem combatentes ou tokens ocultos. Para uma surpresa, marque
  **Oculto** *antes* de adicionar o monstro (ou o token): se você escondê-lo depois, os jogadores já viram o nome.
  Quando a vez é de um combatente oculto, eles veem apenas "Vez do mestre".
- O mestre reenvia o estado do combate e do mapa a cada 15 s: quem perder uma mensagem (rede instável) se corrige sozinho.
  Mudanças feitas *pelo jogador* durante uma queda (ex.: mover token, rolar dado) podem se perder.
- Os resultados dos dados são sorteados no navegador de quem rola. Em mesa de amigos isso basta; para algo que
  precise de rigor, o mestre rola.
- A chave publishable do Supabase é pública por desenho. Quem a tiver pode usar o canal em tempo real; o código
  da sala (6 caracteres aleatórios) é o que separa as mesas. Não use este projeto para dados sensíveis.
- Não há névoa de guerra.

## Estrutura

```
src/
  lib/      conexão com a sala, dados, combate, mapa, segurança (assinaturas), bestiário, backup
  ficha/    esquema (zod), regras de cálculo, leitura/gravação e tela da ficha
  telas/    início, sala, combate, mapa, dados, bestiário, campanha
public/
  exemplos/    fichas de exemplo (2014 e 2024)
  bestiario/   criaturas do SRD (gerado a partir da Open5e)
docs/       formato da ficha e configuração do Supabase
```

## Créditos

Este trabalho inclui material do System Reference Document 5.1 e 5.2 da Wizards of the Coast LLC, licenciado sob a
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
Dados dos monstros obtidos via [Open5e](https://open5e.com). Dungeons & Dragons é marca da Wizards of the Coast;
este projeto não é afiliado nem endossado por ela.
