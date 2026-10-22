#!/bin/bash
# Pruebas de seguridad sobre el stack local. Salida: seguridad.csv (prueba,esperado,obtenido,resultado)
A=http://127.0.0.1:8080/api/v1
J='content-type: application/json'
out=seguridad.csv; echo "n,prueba,esperado,obtenido,resultado" > $out
n=0; reg(){ n=$((n+1)); r=FALLA; [[ "$3" == $2 ]] && r=OK; echo "$n,\"$1\",$2,$3,$r" >> $out; }
tok(){ curl -s -X POST $A/auth/login -H "$J" -d "{\"usuario\":\"$1\",\"password\":\"Prueba.2026\"}" | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))"; }
code(){ curl -s -o /dev/null -w "%{http_code}" "$@"; }
K=$(tok 9000001); D=$(tok 9000002); E=$(tok 8100024)
reg "Endpoint protegido sin token (GET /files)" 401 $(code $A/files)
reg "Token alterado (firma inválida)" 401 $(code $A/files -H "authorization: Bearer ${K%?}x")
reg "Token de otro sistema (JWT falso HS256)" 401 $(code $A/files -H "authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2wiOiJLQVJERVgiLCJzdWIiOiIxIn0.abc")
reg "SEC_DIR intenta ver files (sin permiso, DEC-054)" 403 $(code $A/files -H "authorization: Bearer $D")
reg "Estudiante intenta listar files de todos" 403 $(code $A/files -H "authorization: Bearer $E")
reg "Estudiante intenta abrir el file de otro (id 14)" '40[34]' $(code $A/files/14 -H "authorization: Bearer $E")
reg "Estudiante intenta gestionar usuarios" 403 $(code $A/usuarios -H "authorization: Bearer $E")
reg "Kardex intenta gestionar usuarios (solo ADMIN, DEC-054)" 403 $(code $A/usuarios -H "authorization: Bearer $K")
reg "Inyección SQL en el filtro de búsqueda" '[24]00' $(code "$A/hojas-ruta?texto=%27%20OR%201%3D1--" -H "authorization: Bearer $D")
reg "Inyección SQL en el login" '40[01]' $(code -X POST $A/auth/login -H "$J" -d "{\"usuario\":\"' OR '1'='1\",\"password\":\"x' OR '1'='1\"}")
reg "Campo extra no permitido en el cuerpo (mass assignment)" 400 $(code -X POST $A/hojas-ruta -H "$J" -H "authorization: Bearer $D" -d '{"fileId":14,"tipoTramite":"CERT_NOTAS_ANTERIOR","estado":"ENTREGADO"}')
reg "Cuerpo mayor al límite (200 KB)" 413 $(python3 -c "print('{\"usuario\":\"'+'a'*200000+'\",\"password\":\"x\"}')" | curl -s -o /dev/null -w "%{http_code}" -X POST $A/auth/login -H "$J" --data-binary @-)
# Bloqueo tras 5 intentos fallidos (cuenta 9000003)
for i in 1 2 3 4 5; do c=$(code -X POST $A/auth/login -H "$J" -d '{"usuario":"9000003","password":"mala.123"}'); done
reg "5 intentos fallidos: la 6.ª vez con la contraseña correcta sigue bloqueada" '4[02][0-9]' $(code -X POST $A/auth/login -H "$J" -d '{"usuario":"9000003","password":"Prueba.2026"}')
# Límite de 10 logins por minuto por IP
last=0; for i in $(seq 1 12); do last=$(code -X POST $A/auth/login -H "$J" -d '{"usuario":"0000000","password":"x"}'); done
reg "Más de 10 logins por minuto desde la misma IP" 429 $last
# Bitácora inmutable: el rol de la app no puede modificarla
docker exec siset-db-1 psql -U siset -d siset -c "SET ROLE siset_app; UPDATE log_auditoria SET accion='X' WHERE id=(SELECT min(id) FROM log_auditoria);" >/dev/null 2>bit.err; grep -q "permission denied\|permiso denegado" bit.err && b=DENEGADO || b=PERMITIDO
reg "UPDATE sobre la bitácora con el rol de la aplicación" DENEGADO $b
docker exec siset-db-1 psql -U siset -d siset -c "SET ROLE siset_app; DELETE FROM log_auditoria WHERE id=(SELECT min(id) FROM log_auditoria);" >/dev/null 2>bit.err; grep -q "permission denied\|permiso denegado" bit.err && b=DENEGADO || b=PERMITIDO
reg "DELETE sobre la bitácora con el rol de la aplicación" DENEGADO $b
h=$(docker exec siset-db-1 psql -U siset -d siset -tAc "SELECT left(password_hash,7) FROM usuario LIMIT 1")
reg "Contraseñas guardadas con bcrypt costo 12" '\$2[aby]\$12\$' "$h"
cat $out
