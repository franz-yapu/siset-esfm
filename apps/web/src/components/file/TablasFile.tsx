import type { FileAcademico } from '@/types';
import { fecha, ordinal } from '@/lib/formato';
import { CODIGOS_REQUISITO, NOMBRE_REQUISITO, semaforoRequisito, superaLimite, LIMITE_UF } from '@/lib/reglas';
import { Badge, DataTable, Semaforo } from '@/components/ui';

export function TablaMatriculas({ file }: { file: FileAcademico }) {
  return (
    <DataTable
      data={file.matriculas}
      rowKey={(m) => m.anio}
      vacio="Sin matrículas registradas"
      columns={[
        { key: 'anio', header: 'Año de formación', principal: true, render: (m) => `${ordinal(m.anio)} año` },
        { key: 'gestion', header: 'Gestión' },
        {
          key: 'estado',
          header: 'Estado',
          render: (m) => (
            <Badge className={m.estado === 'Vigente' ? 'bg-sky-50 text-sky-700 ring-sky-300' : undefined}>
              {m.estado}
            </Badge>
          ),
        },
      ]}
    />
  );
}

export function TablaResultados({ file }: { file: FileAcademico }) {
  return (
    <DataTable
      data={file.resultados}
      rowKey={(r) => r.anio}
      vacio="Sin resultados registrados"
      resaltar={superaLimite}
      columns={[
        { key: 'anio', header: 'Año', principal: true, render: (r) => `${ordinal(r.anio)} año` },
        {
          key: 'resultado',
          header: 'Resultado',
          render: (r) => (
            <Badge
              className={
                r.resultado === 'APROBADO'
                  ? 'bg-green-50 text-green-700 ring-green-300'
                  : 'bg-red-50 text-red-700 ring-red-300'
              }
            >
              {r.resultado === 'APROBADO' ? 'Aprobado' : 'Reprobado'}
            </Badge>
          ),
        },
        {
          key: 'uf',
          header: 'UF reprobadas',
          render: (r) => (
            <span className={superaLimite(r) ? 'font-semibold text-red-700' : undefined}>
              {r.ufReprobadas}
              {superaLimite(r) && ` (supera el límite de ${LIMITE_UF})`}
            </span>
          ),
        },
      ]}
    />
  );
}

export function TablaRequisitos({ file }: { file: FileAcademico }) {
  return (
    <DataTable
      data={CODIGOS_REQUISITO}
      rowKey={(c) => c}
      columns={[
        { key: 'req', header: 'Requisito', principal: true, render: (c) => NOMBRE_REQUISITO[c] },
        {
          key: 'estado',
          header: 'Estado',
          render: (c) => (
            <Semaforo
              color={semaforoRequisito(file.requisitos[c])}
              size="sm"
              texto={file.requisitos[c].estado === 'COMPLETO' ? 'Completo' : 'Pendiente'}
            />
          ),
        },
        { key: 'fecha', header: 'Fecha', render: (c) => fecha(file.requisitos[c].fecha) },
        {
          key: 'nro',
          header: 'N.º documento',
          render: (c) => [file.requisitos[c].nro, file.requisitos[c].nivel].filter(Boolean).join(' · ') || '—',
        },
      ]}
    />
  );
}
