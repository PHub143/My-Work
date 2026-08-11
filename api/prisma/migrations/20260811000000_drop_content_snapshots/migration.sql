-- The English content module was replaced by the YBM TOEIC tests, whose content
-- is static in the frontend (allinone/src/data/ybm/). Nothing reads or writes
-- this table any more: the service, controller, routes, admin page and importer
-- were all removed.
DROP TABLE IF EXISTS "ContentSnapshot";
