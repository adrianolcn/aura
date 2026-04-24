alter table public.professionals
add column if not exists locale text not null default 'pt-BR';

alter table public.professionals
drop constraint if exists professionals_locale_check;

alter table public.professionals
add constraint professionals_locale_check
check (locale in ('pt-BR', 'en-US'));

update public.professionals
set locale = 'pt-BR'
where locale is null;
