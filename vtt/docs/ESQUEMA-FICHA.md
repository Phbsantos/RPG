# Esquema da ficha (schemaVersion 1)

A ficha é um arquivo JSON. A definição oficial (e a validação) está em
[`src/ficha/esquema.ts`](../src/ficha/esquema.ts); exemplos prontos em
[`public/exemplos/`](../public/exemplos/).

## Campos obrigatórios

| Campo | Tipo | Observação |
|---|---|---|
| `schemaVersion` | `1` | Versão do formato |
| `edicao` | `"2014"` ou `"2024"` | Define as diferenças entre as edições |
| `nome` | texto | Nome do personagem |
| `classes` | lista | `[{ "nome", "nivel", "subclasse"? }]`; soma dos níveis ≤ 20 (multiclasse permitida) |
| `especie` | texto | 2014: raça (ex.: "Anão da Colina"); 2024: espécie |
| `antecedente` | texto | |
| `atributos` | objeto | `for`, `des`, `con`, `int`, `sab`, `car` (1 a 30) |
| `combate` | objeto | `ca` e `pv: { atual, max, temporario? }` são obrigatórios |

Todo o resto é opcional e tem valor padrão.

## Opcionais

- `proficiencias`: `salvaguardas` (lista de atributos), `pericias` (`{ "atletismo": "proficiente" | "especialista" }`), `ferramentas`, `idiomas`, `armas`, `armaduras`
- `combate`: `iniciativaBonus`, `deslocamento` (metros), `dadosVida` (`[{ dado, total, usados }]`), `salvaguardasContraMorte`, `condicoes`, `exaustao` (0–6), `inspiracao`
- `ataques`: `[{ nome, bonus, dano, tipoDano?, notas? }]`
- `conjuracao`: `atributo`, `espacos` (`{ "1": { total, usados } … "9" }`), `truques`, `magias` (`[{ nome, nivel, preparada, notas? }]`)
- `caracteristicas`: `[{ nome, fonte?, descricao, usosMax?, usosAtuais?, recarga?: "curto" | "longo" }]`
- `talentos`, `inventario`, `moedas` (`pc pp pe po pl`), `notas`

## Diferenças entre as edições

| | 2014 | 2024 |
|---|---|---|
| `maestriasArmas` | proibido | permitido |
| `especie` | raça + sub-raça | espécie |
| `talentos` | opcionais | também usados para o talento de antecedente |

As fórmulas (modificador, bônus de proficiência, salvaguardas, perícias, CD de magia) são iguais nas duas edições.

## Valores derivados

Não são guardados no arquivo; o app calcula a partir dos dados: modificadores, bônus de proficiência,
bônus de salvaguardas e perícias, iniciativa, Percepção passiva, CD e bônus de ataque de magia.
`ca` e o bônus de ataque dos `ataques` ficam no arquivo porque dependem de equipamento e habilidades.

## Evolução do formato

Mudanças que quebram a compatibilidade aumentam `schemaVersion`.
