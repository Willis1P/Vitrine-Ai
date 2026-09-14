-- Allow 'avatar' type for wav2lip local generation (used by /api/v1/avatar/animate)
-- Before: CHECK type IN ('image','video','model','copywriting')
alter table public.generated_content drop constraint if exists generated_content_type_check;
alter table public.generated_content add constraint generated_content_type_check
  check (type in ('image','video','model','copywriting','avatar'));
