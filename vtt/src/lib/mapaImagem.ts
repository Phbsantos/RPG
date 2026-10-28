import { supabase } from './supabase'
import { LIMITE_IMAGEM } from './mapa'

const BUCKET = 'mapas'
const TAMANHO_MAXIMO = 5 * 1024 * 1024
const EXTENSOES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const urlValida = (texto: string) => /^https?:\/\/\S+$/i.test(texto) && texto.length <= 2000

/** Carrega a imagem só para descobrir o tamanho real (e se ela abre de fato). */
export function medirImagem(url: string): Promise<{ largura: number; altura: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () =>
      resolve(
        img.naturalWidth > 0 && img.naturalWidth <= LIMITE_IMAGEM && img.naturalHeight <= LIMITE_IMAGEM
          ? { largura: img.naturalWidth, altura: img.naturalHeight }
          : null,
      )
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Envia o arquivo para o Supabase Storage (bucket público "mapas", ver docs/SUPABASE.md). */
export async function enviarImagem(
  codigo: string,
  arquivo: File,
): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  const extensao = EXTENSOES[arquivo.type]
  if (!extensao) return { ok: false, erro: 'Use uma imagem PNG, JPG, WebP ou GIF.' }
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: 'Imagem grande demais (máximo 5 MB).' }
  if (!supabase) return { ok: false, erro: 'Supabase não configurado.' }

  const caminho = `${codigo}/${crypto.randomUUID()}.${extensao}`
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type })
  if (error) {
    return {
      ok: false,
      erro: `Não consegui enviar a imagem (${error.message}). O bucket "${BUCKET}" já foi criado? Veja docs/SUPABASE.md.`,
    }
  }
  return { ok: true, url: supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl }
}
