

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
        declare "b" "rate_limit_service"."bucket"%ROWTYPE;
        declare "rl" "rate_limit_service"."rateLimit"%ROWTYPE;
        declare "value" bigint;
        begin
            select * into "rl" from "rate_limit_service"."rateLimit" where "id" = "limitId" limit 1;

            --- make sure the bucket exists
            if not exists (select 1 from "rate_limit_service"."bucket" where "token" = "userToken") then
                insert into "rate_limit_service"."bucket" ("token", "currentValue") 
                    values ("userToken", "rl"."credits"::bigint);
            end if;

            --- get the bucket
            select * into "b" from "rate_limit_service"."bucket" where "token" = "userToken" limit 1;


            --- get the time corrected value
            "value" := least("rl"."credits"::bigint, cast(("b"."currentValue" + ((extract(epoch from now())-extract(epoch from "b"."updated")+extract(timezone from now())) * ("rl"."credits"/"rl"."interval"))) as bigint))-"cost";


            --- update the bucket
            update "rate_limit_service"."bucket" set "currentValue" = "value" where "token" = "userToken";
        
            
            return "value";
        end;
    $$ language plpgsql; 