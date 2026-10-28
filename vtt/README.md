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

1. Importe o repositório no GitHub pela Vercel.
2. Em **Settings → General → Root Directory**, use `vtt` (se o projeto estiver numa subpasta).
3. Em **Settings → Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
   As variáveis são embutidas **na hora do build**: depois de alterá-las, faça um novo deploy.
4. A cada `git push` a Vercel publica sozinha.

## Segurança e limites

- O mestre assina o combate e o mapa com uma chave criada na sala; jogadores só aceitam mensagens com essa assinatura.
  O mestre fica ligado ao navegador onde criou a sala.
- Jogadores nunca recebem o PV exato de monstros, nem combatentes ou tokens ocultos.
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
