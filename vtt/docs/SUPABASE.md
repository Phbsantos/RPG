# Configuração do Supabase

## Envio de imagens de mapa (opcional)

Sem isso o mestre ainda pode usar mapas por **URL**. Para enviar arquivos direto pelo app,
crie um bucket público. No Supabase: **SQL Editor → New query**, cole e execute:

```sql
-- Bucket público "mapas": só imagens, até 5 MB por arquivo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mapas', 'mapas', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Qualquer pessoa pode ver as imagens (o link é público)
create policy "mapas: leitura publica"
on storage.objects for select
using (bucket_id = 'mapas');

-- Envio permitido sem login, apenas neste bucket (a chave publishable é pública)
create policy "mapas: envio anonimo"
on storage.objects for insert
to anon
with check (bucket_id = 'mapas');
```

### O que isso significa

- Quem tiver a chave publishable (ela vai no código do site) consegue **enviar** imagens ao bucket.
  Os limites de 5 MB e de tipo de arquivo reduzem o risco, e o plano gratuito tem 1 GB no total.
- Ninguém consegue **apagar ou sobrescrever** imagens, pois não há política de `update` nem `delete`.
- Para liberar espaço, apague arquivos antigos em **Storage → mapas** no painel.
- Se preferir não abrir envio anônimo, não rode este SQL e use mapas por URL.
