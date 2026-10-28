import { z } from 'zod'

// Esquema da ficha de personagem (schemaVersion 1). Documentação em docs/ESQUEMA-FICHA.md.
// Serve às duas edições de D&D; o campo "edicao" decide as poucas diferenças.

export const ATRIBUTOS = ['for', 'des', 'con', 'int', 'sab', 'car'] as const
export type Atributo = (typeof ATRIBUTOS)[number]

export const NOMES_ATRIBUTO: Record<Atributo, string> = {
  for: 'Força',
  des: 'Destreza',
  con: 'Constituição',
  int: 'Inteligência',
  sab: 'Sabedoria',
  car: 'Carisma',
}

export const PERICIAS = {
  acrobacia: { nome: 'Acrobacia', atributo: 'des' },
  arcanismo: { nome: 'Arcanismo', atributo: 'int' },
  atletismo: { nome: 'Atletismo', atributo: 'for' },
  atuacao: { nome: 'Atuação', atributo: 'car' },
  enganacao: { nome: 'Enganação', atributo: 'car' },
  furtividade: { nome: 'Furtividade', atributo: 'des' },
  historia: { nome: 'História', atributo: 'int' },
  intimidacao: { nome: 'Intimidação', atributo: 'car' },
  intuicao: { nome: 'Intuição', atributo: 'sab' },
  investigacao: { nome: 'Investigação', atributo: 'int' },
  lidarComAnimais: { nome: 'Lidar com Animais', atributo: 'sab' },
  medicina: { nome: 'Medicina', atributo: 'sab' },
  natureza: { nome: 'Natureza', atributo: 'int' },
  percepcao: { nome: 'Percepção', atributo: 'sab' },
  persuasao: { nome: 'Persuasão', atributo: 'car' },
  prestidigitacao: { nome: 'Prestidigitação', atributo: 'des' },
  religiao: { nome: 'Religião', atributo: 'int' },
  sobrevivencia: { nome: 'Sobrevivência', atributo: 'sab' },
} as const satisfies Record<string, { nome: string; atributo: Atributo }>

export type PericiaId = keyof typeof PERICIAS
const IDS_PERICIA = Object.keys(PERICIAS) as [PericiaId, ...PericiaId[]]

export const CONDICOES = [
  'Amedrontado',
  'Atordoado',
  'Caído',
  'Cego',
  'Contido',
  'Encantado',
  'Envenenado',
  'Imobilizado',
  'Incapacitado',
  'Inconsciente',
  'Invisível',
  'Paralisado',
  'Petrificado',
  'Surdo',
] as const

const inteiro = (min: number, max: number) => z.number().int().min(min).max(max)
const texto = (max = 200) => z.string().max(max)

const Caracteristica = z
  .object({
    nome: z.string().min(1).max(80),
    fonte: texto(80).optional(), // "Guerreiro 1", "Espécie", "Talento"…
    descricao: texto(2000).default(''),
    usosMax: inteiro(1, 99).optional(),
    usosAtuais: inteiro(0, 99).optional(),
    recarga: z.enum(['curto', 'longo']).optional(),
  })
  .transform((c) => (c.usosMax !== undefined && c.usosAtuais === undefined ? { ...c, usosAtuais: c.usosMax } : c))

const EspacoDeMagia = z.object({ total: inteiro(0, 9), usados: inteiro(0, 9) })

export const FichaSchema = z
  .object({
    schemaVersion: z.literal(1),
    edicao: z.enum(['2014', '2024']),

    nome: z.string().min(1).max(60),
    jogador: texto(60).optional(),
    classes: z
      .array(
        z.object({
          nome: z.string().min(1).max(40),
          nivel: inteiro(1, 20),
          subclasse: texto(60).optional(),
        }),
      )
      .min(1)
      .max(12),
    especie: z.string().min(1).max(80), // 2014: raça (ex.: "Anão da Colina"); 2024: espécie
    antecedente: z.string().min(1).max(80),
    tendencia: texto(40).optional(),
    experiencia: inteiro(0, 10_000_000).default(0),

    atributos: z.object({
      for: inteiro(1, 30),
      des: inteiro(1, 30),
      con: inteiro(1, 30),
      int: inteiro(1, 30),
      sab: inteiro(1, 30),
      car: inteiro(1, 30),
    }),

    proficiencias: z
      .object({
        salvaguardas: z.array(z.enum(ATRIBUTOS)).default([]),
        pericias: z.partialRecord(z.enum(IDS_PERICIA), z.enum(['proficiente', 'especialista'])).default({}),
        ferramentas: z.array(texto(80)).default([]),
        idiomas: z.array(texto(40)).default([]),
        armas: z.array(texto(80)).default([]),
        armaduras: z.array(texto(80)).default([]),
      })
      .default({ salvaguardas: [], pericias: {}, ferramentas: [], idiomas: [], armas: [], armaduras: [] }),

    combate: z.object({
      ca: inteiro(0, 40),
      iniciativaBonus: inteiro(-20, 20).default(0), // além do modificador de Destreza
      deslocamento: z.number().min(0).max(300).default(9), // em metros
      pv: z.object({
        atual: inteiro(0, 999),
        max: inteiro(1, 999),
        temporario: inteiro(0, 999).default(0),
      }),
      dadosVida: z
        .array(
          z.object({
            dado: z.enum(['d6', 'd8', 'd10', 'd12']),
            total: inteiro(1, 20),
            usados: inteiro(0, 20),
          }),
        )
        .default([]),
      salvaguardasContraMorte: z
        .object({ sucessos: inteiro(0, 3), falhas: inteiro(0, 3) })
        .default({ sucessos: 0, falhas: 0 }),
      condicoes: z.array(texto(40)).default([]),
      exaustao: inteiro(0, 6).default(0),
      inspiracao: z.boolean().default(false),
    }),

    ataques: z
      .array(
        z.object({
          nome: z.string().min(1).max(80),
          bonus: inteiro(-20, 30), // bônus de ataque total
          dano: texto(40), // fórmula, ex.: "1d8+3"
          tipoDano: texto(40).optional(),
          notas: texto(300).optional(),
        }),
      )
      .default([]),

    conjuracao: z
      .object({
        atributo: z.enum(ATRIBUTOS),
        espacos: z.record(z.string().regex(/^[1-9]$/, 'nível de espaço deve ser de 1 a 9'), EspacoDeMagia).default({}),
        truques: z.array(texto(80)).default([]),
        magias: z
          .array(
            z.object({
              nome: z.string().min(1).max(80),
              nivel: inteiro(1, 9),
              preparada: z.boolean().default(false),
              notas: texto(300).optional(),
            }),
          )
          .default([]),
      })
      .optional(),

    caracteristicas: z.array(Caracteristica).default([]),
    talentos: z.array(texto(80)).default([]),
    maestriasArmas: z.array(texto(80)).optional(), // só existe na edição 2024

    inventario: z
      .array(
        z.object({
          nome: z.string().min(1).max(80),
          quantidade: inteiro(0, 9999).default(1),
          peso: z.number().min(0).optional(),
          equipado: z.boolean().default(false),
          notas: texto(300).optional(),
        }),
      )
      .default([]),
    moedas: z
      .object({
        pc: inteiro(0, 9_999_999).default(0),
        pp: inteiro(0, 9_999_999).default(0),
        pe: inteiro(0, 9_999_999).default(0),
        po: inteiro(0, 9_999_999).default(0),
        pl: inteiro(0, 9_999_999).default(0),
      })
      .default({ pc: 0, pp: 0, pe: 0, po: 0, pl: 0 }),

    notas: z
      .object({
        aparencia: texto(2000).default(''),
        personalidade: texto(2000).default(''),
        historia: texto(5000).default(''),
        anotacoes: texto(5000).default(''),
      })
      .default({ aparencia: '', personalidade: '', historia: '', anotacoes: '' }),
  })
  .superRefine((f, ctx) => {
    if (f.classes.reduce((soma, c) => soma + c.nivel, 0) > 20) {
      ctx.addIssue({ code: 'custom', path: ['classes'], message: 'a soma dos níveis não pode passar de 20' })
    }
    if (f.combate.pv.atual > f.combate.pv.max) {
      ctx.addIssue({ code: 'custom', path: ['combate', 'pv', 'atual'], message: 'PV atual maior que o máximo' })
    }
    if (f.edicao === '2014' && f.maestriasArmas !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['maestriasArmas'],
        message: 'maestrias de armas só existem na edição 2024',
      })
    }
  })

export type Ficha = z.infer<typeof FichaSchema>
export type Caracteristica = Ficha['caracteristicas'][number]
