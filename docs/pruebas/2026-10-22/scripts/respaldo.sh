#!/bin/bash
# Respaldo y restauración de prueba: pg_dump de siset → restaurar en siset_restaurada → comparar filas por tabla.
set -e
q(){ docker exec siset-db-1 psql -U siset -d $1 -tAc "$2"; }
echo "== 1) Respaldo (pg_dump formato custom)"; t0=$(date +%s.%N)
docker exec siset-db-1 pg_dump -U siset -d siset -Fc -f /tmp/siset.dump
docker exec siset-db-1 ls -la /tmp/siset.dump | awk '{print "archivo /tmp/siset.dump  "$5" bytes"}'
echo "   duración: $(echo "$(date +%s.%N)-$t0" | bc) s"
echo "== 2) Restauración en una base nueva (siset_restaurada)"; t0=$(date +%s.%N)
docker exec siset-db-1 dropdb -U siset --if-exists siset_restaurada; docker exec siset-db-1 createdb -U siset siset_restaurada
docker exec siset-db-1 pg_restore -U siset -d siset_restaurada --no-owner /tmp/siset.dump 2>&1 | grep -v "role .* does not exist" || true
echo "   duración: $(echo "$(date +%s.%N)-$t0" | bc) s"
echo "== 3) Comparación de filas por tabla (original vs restaurada)"
ok=0; tot=0
for t in $(q siset "select tablename from pg_tables where schemaname='public' order by 1"); do
  a=$(q siset "select count(*) from \"$t\""); b=$(q siset_restaurada "select count(*) from \"$t\""); tot=$((tot+1))
  [ "$a" = "$b" ] && { r=OK; ok=$((ok+1)); } || r=DIFERENTE
  printf "   %-24s %8s %8s  %s\n" "$t" "$a" "$b" "$r"
done
echo "== Tablas iguales: $ok de $tot"
h1=$(q siset "select md5(string_agg(nro_tramite||estado_actual,',' order by id)) from hoja_ruta"); h2=$(q siset_restaurada "select md5(string_agg(nro_tramite||estado_actual,',' order by id)) from hoja_ruta")
echo "== Huella MD5 de hoja_ruta: original $h1 / restaurada $h2 $([ "$h1" = "$h2" ] && echo IGUALES-OK || echo DISTINTAS)"
