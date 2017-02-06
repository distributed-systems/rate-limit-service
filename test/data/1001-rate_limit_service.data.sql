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

SET search_path = rate_limit_service, pg_catalog;

--
-- Data for Name: principalType; Type: TABLE DATA; Schema: rate_limit_service; Owner: postgres
--

COPY "principalType" (id, identifier) FROM stdin;
1	role
\.


--
-- Name: principalType_id_seq; Type: SEQUENCE SET; Schema: rate_limit_service; Owner: postgres
--

SELECT pg_catalog.setval('"principalType_id_seq"', 1, true);


--
-- PostgreSQL database dump complete
--

