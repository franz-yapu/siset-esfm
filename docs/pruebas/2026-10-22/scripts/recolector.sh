#!/bin/bash
# CPU/RAM del equipo y de los contenedores de SISET cada ~2 s → InfluxDB (db k6).
INFLUX="http://127.0.0.1:8086/write?db=k6&precision=s"
while true; do
  ts=$(date +%s)
  read -r _ u n s i w _ < /proc/stat; t1=$((u+n+s+i+w)); i1=$i; sleep 1
  read -r _ u n s i w _ < /proc/stat; t2=$((u+n+s+i+w)); i2=$i
  cpu=$(( (100*((t2-t1)-(i2-i1))) / (t2-t1) ))
  mem=$(awk '/MemTotal/{t=$2}/MemAvailable/{a=$2}END{printf "%.0f", (t-a)/1024}' /proc/meminfo)
  {
  echo "servidor cpu_pct=${cpu},mem_mb=${mem} ${ts}"
  docker stats --no-stream --format "{{.Name}} {{.CPUPerc}} {{.MemUsage}}" siset-api-1 siset-db-1 siset-web-1 | while read -r nom c m _; do
    c=${c%\%}; v=${m%%[A-Za-z]*}; uni=${m#$v}
    case "$uni" in GiB*) v=$(awk "BEGIN{print $v*1024}");; KiB*) v=$(awk "BEGIN{print $v/1024}");; esac
    echo "contenedor,nombre=${nom} cpu_pct=${c},mem_mb=${v} ${ts}"
  done
  } | curl -s -XPOST "$INFLUX" --data-binary @- >/dev/null
done
