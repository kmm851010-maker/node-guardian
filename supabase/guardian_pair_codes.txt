create table if not exists guardian_pair_codes (
  pi_uid      text primary key,
  code        text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);
