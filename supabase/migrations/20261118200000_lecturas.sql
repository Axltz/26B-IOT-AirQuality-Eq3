-- Histórico de lecturas de los nodos AURA-172.
--
-- Cada ESP32 inserta una fila por minuto directo en la Data API de Supabase
-- (POST /rest/v1/lecturas) con la clave publicable. La app lee esta tabla con
-- la misma clave para dibujar la gráfica de las últimas horas, aunque nadie la
-- haya tenido abierta.
--
-- Con la clave publicable (rol anon) solo se puede LEER e INSERTAR: nadie
-- puede editar ni borrar filas. Los CHECK descartan valores fuera de rango
-- físico y tópicos que no sean de AURA-172.

create table public.lecturas (
  id            bigint generated always as identity primary key,
  creado_en     timestamptz not null default now(),
  topico        text not null check (topico ~ '^colectivo/aire/[A-Za-z0-9_-]{1,40}$'),
  pm1           real check (pm1 between 0 and 1000),
  pm25          real check (pm25 between 0 and 1000),
  pm10          real check (pm10 between 0 and 2000),
  co            real check (co between 0 and 1000),
  temp          real check (temp between -40 and 85),
  hum           real check (hum between 0 and 100),
  nivel_general smallint check (nivel_general between 0 and 4),
  dominante     text check (char_length(dominante) <= 10)
);

comment on table public.lecturas is
  'Una muestra por minuto de cada nodo ESP32 (tópico colectivo/aire/<NODO_ID>).';

-- La app consulta "las filas de un tópico desde tal hora".
create index lecturas_topico_creado_en_idx on public.lecturas (topico, creado_en);

-- La hora la pone el servidor: el ESP32 no tiene reloj confiable y así nadie
-- puede insertar filas con fechas inventadas.
create function public.lecturas_hora_servidor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.creado_en := now();
  return new;
end;
$$;

create trigger lecturas_hora_servidor
  before insert on public.lecturas
  for each row execute function public.lecturas_hora_servidor();

-- Seguridad: RLS activado y permisos mínimos para la clave publicable.
alter table public.lecturas enable row level security;

revoke all on table public.lecturas from anon, authenticated;
grant select, insert on table public.lecturas to anon;

create policy "Cualquiera puede leer el historico"
  on public.lecturas for select
  to anon
  using (true);

create policy "Los nodos pueden insertar lecturas"
  on public.lecturas for insert
  to anon
  with check (true);
