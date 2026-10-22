#!/bin/bash
# Uso: integridad-check.sh <id_base>  → verificaciones en la base tras las altas concurrentes.
B=$1; q(){ docker exec siset-db-1 psql -U siset -d siset -tAc "$1"; }
echo "verificacion,valor"
echo "Hojas creadas en la prueba,$(q "select count(*) from hoja_ruta where id>$B")"
echo "N.º de trámite repetidos (toda la tabla),$(q "select count(*) from (select nro_tramite from hoja_ruta group by 1 having count(*)>1) x")"
echo "Saltos en el correlativo de la gestión 2026,$(q "select (max(split_part(nro_tramite,'-',3)::int)-min(split_part(nro_tramite,'-',3)::int)+1)-count(*) from hoja_ruta where gestion=2026")"
echo "Correlativo guardado = último N.º emitido,$(q "select case when (select ultimo from hoja_ruta_correlativo where gestion=2026) = (select max(split_part(nro_tramite,'-',3)::int) from hoja_ruta where gestion=2026) then 'SI' else 'NO' end")"
echo "Hojas nuevas sin evento CREAR en la bitácora,$(q "select count(*) from hoja_ruta h where id>$B and not exists (select 1 from log_auditoria l where l.modulo='HOJAS_RUTA' and l.accion='CREAR' and l.entidad_id=h.nro_tramite)")"
echo "Hojas nuevas sin movimiento inicial,$(q "select count(*) from hoja_ruta h where id>$B and not exists (select 1 from movimiento_hoja_ruta m where m.hoja_ruta_id=h.id)")"
echo "Hojas con file inexistente (huérfanas),$(q "select count(*) from hoja_ruta h where not exists (select 1 from file_academico f where f.id=h.file_id)")"
echo "Movimientos huérfanos,$(q "select count(*) from movimiento_hoja_ruta m where not exists (select 1 from hoja_ruta h where h.id=m.hoja_ruta_id)")"
echo "Requisitos de file huérfanos,$(q "select count(*) from requisito_file r where not exists (select 1 from file_academico f where f.id=r.file_id)")"
