

    set search_path to "rate_limit_service";







    create table "principalType" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , constraint "principalType_pk"
            primary key ("id")
        , constraint "principalType_unique_identifier"
            unique ("identifier")
    );

    create table "principal" (
          "id"                          serial not null
        , "id_principalType"            int not null
        , "principalId"                 int not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "principal_pk"
            primary key ("id")
        , constraint "principal_unique_principal"
            unique ("id_principalType", "principalId")
        , constraint "principal_fk_principalType"
            foreign key ("id_principalType")
            references "principalType"("id")
            on update cascade
            on delete restrict
    );






    create table "rateLimit" (
          "id"                          serial not null
        , "id_principal"                int not null
        , "interval"                    int not null
        , "credits"                     int not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "rateLimit_pk"
            primary key ("id")
        , constraint "rateLimit_fk_principal"
            foreign key ("id_principal")
            references "principal"("id")
            on update cascade
            on delete restrict
    );



    create table "bucket" (
          "id"                          serial not null
        , "token"                       varchar(64) not null
        , "currentValue"                bigint not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , constraint "bucket_pk"
            primary key ("id")
        , constraint "unique_bucket_token"
            unique ("token")
    );







    create or replace function "rate_limit_service"."createOrUpdateBucket"("limitId" int, "userToken" varchar(64), "cost" bigint) returns bigint as $$
        declare "value" int;
        begin

            --- make sure the bucket exists
            if not exists (select 1 from "rate_limit_service"."bucket" where "token" = "userToken") then
                insert into "rate_limit_service"."bucket" ("token", "currentValue") 
                    values ("userToken", (select "credits" from "rate_limit_service"."rateLimit" where "id" = "limitId"));
            end if;

            --- update the bucket
            update "rate_limit_service"."bucket" set "currentValue" = ("currentValue"-"cost") where "token" = "userToken";
        
            select "currentValue" into "value" from "rate_limit_service"."bucket" where "token" = "userToken" limit 1;
            
            return "value";
        end;
    $$ language plpgsql; 