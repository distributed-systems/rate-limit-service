--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.2
-- Dumped by pg_dump version 9.6.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: rate_limit_service; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA rate_limit_service;


ALTER SCHEMA rate_limit_service OWNER TO postgres;

SET search_path = rate_limit_service, pg_catalog;

--
-- Name: createOrUpdateBucket(integer, character varying, bigint); Type: FUNCTION; Schema: rate_limit_service; Owner: postgres
--

CREATE FUNCTION "createOrUpdateBucket"("limitId" integer, "userToken" character varying, cost bigint) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
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
    $$;


ALTER FUNCTION rate_limit_service."createOrUpdateBucket"("limitId" integer, "userToken" character varying, cost bigint) OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: bucket; Type: TABLE; Schema: rate_limit_service; Owner: postgres
--

CREATE TABLE bucket (
    id integer NOT NULL,
    token character varying(64) NOT NULL,
    "currentValue" bigint NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE bucket OWNER TO postgres;

--
-- Name: bucket_id_seq; Type: SEQUENCE; Schema: rate_limit_service; Owner: postgres
--

CREATE SEQUENCE bucket_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE bucket_id_seq OWNER TO postgres;

--
-- Name: bucket_id_seq; Type: SEQUENCE OWNED BY; Schema: rate_limit_service; Owner: postgres
--

ALTER SEQUENCE bucket_id_seq OWNED BY bucket.id;


--
-- Name: principal; Type: TABLE; Schema: rate_limit_service; Owner: postgres
--

CREATE TABLE principal (
    id integer NOT NULL,
    "id_principalType" integer NOT NULL,
    "principalId" integer NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    deleted timestamp without time zone
);


ALTER TABLE principal OWNER TO postgres;

--
-- Name: principalType; Type: TABLE; Schema: rate_limit_service; Owner: postgres
--

CREATE TABLE "principalType" (
    id integer NOT NULL,
    identifier character varying(50) NOT NULL
);


ALTER TABLE "principalType" OWNER TO postgres;

--
-- Name: principalType_id_seq; Type: SEQUENCE; Schema: rate_limit_service; Owner: postgres
--

CREATE SEQUENCE "principalType_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "principalType_id_seq" OWNER TO postgres;

--
-- Name: principalType_id_seq; Type: SEQUENCE OWNED BY; Schema: rate_limit_service; Owner: postgres
--

ALTER SEQUENCE "principalType_id_seq" OWNED BY "principalType".id;


--
-- Name: principal_id_seq; Type: SEQUENCE; Schema: rate_limit_service; Owner: postgres
--

CREATE SEQUENCE principal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE principal_id_seq OWNER TO postgres;

--
-- Name: principal_id_seq; Type: SEQUENCE OWNED BY; Schema: rate_limit_service; Owner: postgres
--

ALTER SEQUENCE principal_id_seq OWNED BY principal.id;


--
-- Name: rateLimit; Type: TABLE; Schema: rate_limit_service; Owner: postgres
--

CREATE TABLE "rateLimit" (
    id integer NOT NULL,
    id_principal integer NOT NULL,
    "interval" integer NOT NULL,
    credits integer NOT NULL,
    created timestamp without time zone DEFAULT now() NOT NULL,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    deleted timestamp without time zone
);


ALTER TABLE "rateLimit" OWNER TO postgres;

--
-- Name: rateLimit_id_seq; Type: SEQUENCE; Schema: rate_limit_service; Owner: postgres
--

CREATE SEQUENCE "rateLimit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "rateLimit_id_seq" OWNER TO postgres;

--
-- Name: rateLimit_id_seq; Type: SEQUENCE OWNED BY; Schema: rate_limit_service; Owner: postgres
--

ALTER SEQUENCE "rateLimit_id_seq" OWNED BY "rateLimit".id;


--
-- Name: bucket id; Type: DEFAULT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY bucket ALTER COLUMN id SET DEFAULT nextval('bucket_id_seq'::regclass);


--
-- Name: principal id; Type: DEFAULT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY principal ALTER COLUMN id SET DEFAULT nextval('principal_id_seq'::regclass);


--
-- Name: principalType id; Type: DEFAULT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY "principalType" ALTER COLUMN id SET DEFAULT nextval('"principalType_id_seq"'::regclass);


--
-- Name: rateLimit id; Type: DEFAULT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY "rateLimit" ALTER COLUMN id SET DEFAULT nextval('"rateLimit_id_seq"'::regclass);


--
-- Name: bucket bucket_pk; Type: CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY bucket
    ADD CONSTRAINT bucket_pk PRIMARY KEY (id);


--
-- Name: principalType principalType_pk; Type: CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY "principalType"
    ADD CONSTRAINT "principalType_pk" PRIMARY KEY (id);


--
-- Name: principalType principalType_unique_identifier; Type: CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY "principalType"
    ADD CONSTRAINT "principalType_unique_identifier" UNIQUE (identifier);


--
-- Name: principal principal_pk; Type: CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY principal
    ADD CONSTRAINT principal_pk PRIMARY KEY (id);


--
-- Name: principal principal_unique_principal; Type: CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY principal
    ADD CONSTRAINT principal_unique_principal UNIQUE ("id_principalType", "principalId");


--
-- Name: rateLimit rateLimit_pk; Type: CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY "rateLimit"
    ADD CONSTRAINT "rateLimit_pk" PRIMARY KEY (id);


--
-- Name: bucket unique_bucket_token; Type: CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY bucket
    ADD CONSTRAINT unique_bucket_token UNIQUE (token);


--
-- Name: principal principal_fk_principalType; Type: FK CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY principal
    ADD CONSTRAINT "principal_fk_principalType" FOREIGN KEY ("id_principalType") REFERENCES "principalType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rateLimit rateLimit_fk_principal; Type: FK CONSTRAINT; Schema: rate_limit_service; Owner: postgres
--

ALTER TABLE ONLY "rateLimit"
    ADD CONSTRAINT "rateLimit_fk_principal" FOREIGN KEY (id_principal) REFERENCES principal(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

