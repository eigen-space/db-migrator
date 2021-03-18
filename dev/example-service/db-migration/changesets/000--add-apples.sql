create extension if not exists "uuid-ossp";

create table apples (
    id           uuid default uuid_generate_v4() not null
        constraint apples_id_pk
            primary key,
    external_id  integer                         not null,
    name         text,
    description  text,
    url          text,
    archived     boolean,
    disabled     boolean,
    created_at   timestamp with time zone
);

alter table apples
    owner to postgres;

create unique index apples_externalid_uindex
    on apples(external_id);

create unique index apples_id_uindex
    on apples(id);
