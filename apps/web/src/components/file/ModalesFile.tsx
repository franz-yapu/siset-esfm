import { useState } from 'react';
import type { FileAcademico, ResultadoAnual } from '@/types';
import { ordinal } from '@/lib/formato';
import { LIMITE_UF } from '@/lib/reglas';
import { Alerta, Button, Input, Modal, Select } from '@/components/ui';

interface Base {
  onCerrar: () => void;
  ocupado: boolean;
}

export function ModalMatricula({
  file,
  onCerrar,
  onGuardar,
  ocupado,
}: Base & { file: FileAcademico; onGuardar: (anio: number, gestion: number) => void }) {
  const sig = (file.matriculas.at(-1)?.anio ?? 0) + 1;
  const [anio, setAnio] = useState(Math.min(sig, 5));
  const [gestion, setGestion] = useState(new Date().getFullYear());
  return (
    <Modal
      open
      onClose={onCerrar}
      title="Registrar matrícula"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={() => onGuardar(anio, gestion)}>
            Registrar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Año de formación" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((a) => (
            <option key={a} value={a} disabled={file.matriculas.some((m) => m.anio === a)}>
              {ordinal(a)} año
            </option>
          ))}
        </Select>
        <Input label="Gestión" type="number" value={gestion} onChange={(e) => setGestion(Number(e.target.value))} />
      </div>
    </Modal>
  );
}

/** RF-07: avisa antes de guardar si el resultado bloqueará el file. */
export function ModalResultado({
  file,
  onCerrar,
  onGuardar,
  ocupado,
}: Base & { file: FileAcademico; onGuardar: (r: ResultadoAnual) => void }) {
  const [anio, setAnio] = useState(file.matriculas.at(-1)?.anio ?? 1);
  const [uf, setUf] = useState(0);
  const [resultado, setResultado] = useState<ResultadoAnual['resultado']>('APROBADO');
  const bloqueara = uf > LIMITE_UF;
  return (
    <Modal
      open
      onClose={onCerrar}
      title="Registrar resultado anual"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant={bloqueara ? 'danger' : 'primary'}
            loading={ocupado}
            onClick={() => onGuardar({ anio, resultado, ufReprobadas: uf })}
          >
            Registrar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Año de formación" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((a) => (
            <option key={a} value={a}>
              {ordinal(a)} año
            </option>
          ))}
        </Select>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Resultado</legend>
          <div className="flex gap-2">
            {(['APROBADO', 'REPROBADO'] as const).map((r) => (
              <label
                key={r}
                className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-checked:border-acento has-checked:bg-sky-50"
              >
                <input
                  type="radio"
                  name="resultado"
                  className="accent-primario"
                  checked={resultado === r}
                  onChange={() => setResultado(r)}
                />
                {r === 'APROBADO' ? 'Aprobado' : 'Reprobado'}
              </label>
            ))}
          </div>
        </fieldset>
        <Input
          label="N.º de UF reprobadas"
          type="number"
          min={0}
          max={20}
          value={uf}
          onChange={(e) => setUf(Math.max(0, Number(e.target.value)))}
          hint={`Límite: ${LIMITE_UF} UF por año`}
        />
        {bloqueara && (
          <Alerta tipo="error" titulo="Este resultado bloqueará el file">
            Supera el límite de {LIMITE_UF} UF reprobadas. No podrá dictaminarse ni emitirse documentos hasta
            desbloquearlo.
          </Alerta>
        )}
      </div>
    </Modal>
  );
}
