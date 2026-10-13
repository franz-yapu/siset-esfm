# Subsistemas intocables

> Propuesta inicial derivada del PRD — confirmar cuando exista el código. No se
> reescriben ni reestructuran sin un ADR en `docs/adr/`.

| Subsistema                                                    | Por qué está protegido                                    | Qué exige tocarlo                                              |
| ------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Auth y RBAC (login, tokens, `authorize`, helper de propiedad) | Un fallo expone files de terceros (R6)                    | ADR + pruebas negativas por rol                                |
| Máquina de estados de la hoja de ruta                         | Define la trazabilidad (O1) y el timeline público         | ADR + actualizar `business-rules.md` + pruebas de transiciones |
| Generador de correlativo HR-AAAA-NNNNNN                       | Debe ser único y sin carreras; cambia documentos impresos | ADR                                                            |
| Motor de semáforo y bloqueo por UF                            | Es lo que evita titulaciones indebidas (O3)               | ADR + tabla de casos de prueba                                 |
| Bitácora (`log_auditoria`)                                    | Valor de auditoría; append-only                           | ADR                                                            |
