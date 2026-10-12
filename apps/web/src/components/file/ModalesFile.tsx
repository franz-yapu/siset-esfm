import { useState } from 'react';
import type { CodigoRequisito, FileAcademico, NivelTclo, Requisito, ResultadoAnual } from '@/types';
import { hoy, ordinal } from '@/lib/formato';
import { LIMITE_UF, NOMBRE_REQUISITO } from '@/lib/reglas';
import { Alerta, Button, Input, Modal, Select, Textarea } from '@/components/ui';

interface Base { onCerrar: () => void; ocupado: boolean }

export function ModalMatricula({ file, onCerrar, onGuardar, ocupado }: Base & { file: FileAcademico; onGuardar: (anio: number, gestion: number) => void }) {
  const sig = (file.matriculas.at(-1)?.anio ?? 0) + 1;
  const [anio, setAnio] = useState(Math.min(sig, 5));
  const [gestion, setGestion] = useState(new Date().getFullYear());
  return (
    <Modal open onClose={onCerrar} title="Registrar matrícula" size="sm"
      footer={<><Button variant="secondary" onClick={onCerrar}>Cancelar</Button><Button loading={ocupado} onClick={() => onGuardar(anio, gestion)}>Registrar</Button></>}>
      <div className="space-y-4">
        <Select label="Año de formación" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((a) => <option key={a} value={a} disabled={file.matriculas.some((m) => m.anio === a)}>{ordinal(a)} año</option>)}
        </Select>
        <Input label="Gestión" type="number" value={gestion} onChange={(e) => setGestion(Number(e.target.value))} />
      </div>
    </Modal>
  );
}

/** RF-07: avisa antes de guardar si el resultado bloqueará el file. */
export function ModalResultado({ file, onCerrar, onGuardar, ocupado }: Base & { file: FileAcademico; onGuardar: (r: ResultadoAnual) => void }) {
  const [anio, setAnio] = useState(file.matriculas.at(-1)?.anio ?? 1);
  const [uf, setUf] = useState(0);
  const [resultado, setResultado] = useState<ResultadoAnual['resultado']>('APROBADO');
  const bloqueara = uf > LIMITE_UF;
  return (
    <Modal open onClose={onCerrar} title="Registrar resultado anual" size="sm"
      footer={<><Button variant="secondary" onClick={onCerrar}>Cancelar</Button><Button variant={bloqueara ? 'danger' : 'primary'} loading={ocupado} onClick={() => onGuardar({ anio, resultado, ufReprobadas: uf })}>Registrar</Button></>}>
      <div className="space-y-4">
        <Select label="Año de formación" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((a) => <option key={a} value={a}>{ordinal(a)} año</option>)}
        </Select>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Resultado</legend>
          <div className="flex gap-2">
            {(['APROBADO', 'REPROBADO'] as const).map((r) => (
              <label key={r} className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-checked:border-acento has-checked:bg-sky-50">
                <input type="radio" name="resultado" className="accent-primario" checked={resultado === r} onChange={() => setResultado(r)} />{r === 'APROBADO' ? 'Aprobado' : 'Reprobado'}
              </label>
            ))}
          </div>
        </fieldset>
        <Input label="N.º de UF reprobadas" type="number" min={0} max={20} value={uf} onChange={(e) => setUf(Math.max(0, Number(e.target.value)))} hint={`Límite: ${LIMITE_UF} UF por año`} />
        {bloqueara && <Alerta tipo="error" titulo="Este resultado bloqueará el file">Supera el límite de {LIMITE_UF} UF reprobadas. No podrá dictaminarse ni emitirse documentos hasta desbloquearlo.</Alerta>}
      </div>
    </Modal>
  );
}

export function ModalRequisito({ codigo, onCerrar, onGuardar, ocupado, responsable }: Base & { codigo: CodigoRequisito; responsable: string; onGuardar: (r: Requisito) => void }) {
  const [fechaR, setFechaR] = useState(hoy());
  const [nro, setNro] = useState('');
  const [nivel, setNivel] = useState<NivelTclo>('Intermedio');
  const necesitaNro = codigo !== 'TACFI';
  const error = necesitaNro && !nro.trim() ? 'Obligatorio' : null;
  const [enviado, setEnviado] = useState(false);
  const titulo = codigo === 'TACFI' ? 'Registrar recepción física de TACFI' : codigo === 'TCLO' ? 'Registrar certificado TCLO' : 'Registrar certificado de notas';
  const guardar = () => {
    setEnviado(true);
    if (error) return;
    onGuardar({ estado: 'COMPLETO', fecha: fechaR, ...(necesitaNro ? { nro: nro.trim() } : { responsable }), ...(codigo === 'TCLO' ? { nivel } : {}) });
  };
  return (
    <Modal open onClose={onCerrar} title={titulo} size="sm"
      footer={<><Button variant="secondary" onClick={onCerrar}>Cancelar</Button><Button loading={ocupado} onClick={guardar}>Registrar</Button></>}>
      <div className="space-y-4">
        {codigo === 'TCLO' && (
          <Select label="Nivel acreditado" value={nivel} onChange={(e) => setNivel(e.target.value as NivelTclo)} hint="D-04: el nivel exigido aún está por definir">
            <option>Básico</option><option>Intermedio</option><option>Avanzado</option>
          </Select>
        )}
        {necesitaNro && <Input label={`N.º de ${codigo === 'TCLO' ? 'certificado' : 'documento'}`} value={nro} onChange={(e) => setNro(e.target.value)} error={enviado ? error : null} />}
        <Input label={codigo === 'TACFI' ? 'Fecha de recepción' : 'Fecha'} type="date" value={fechaR} max={hoy()} onChange={(e) => setFechaR(e.target.value)} />
        {codigo === 'TACFI' && <Input label="Responsable" value={responsable} disabled />}
        <p className="text-xs text-slate-500">El requisito {NOMBRE_REQUISITO[codigo]} pasará a “Completo” y el semáforo se actualizará al instante.</p>
      </div>
    </Modal>
  );
}

/** RF-07 CA3: bloquear o desbloquear exige motivo. */
export function ModalBloqueo({ bloquear, onCerrar, onGuardar, ocupado }: Base & { bloquear: boolean; onGuardar: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('');
  const [enviado, setEnviado] = useState(false);
  return (
    <Modal open onClose={onCerrar} title={bloquear ? 'Bloquear file' : 'Desbloquear file'} size="sm"
      footer={<><Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
        <Button variant={bloquear ? 'danger' : 'success'} loading={ocupado} onClick={() => { setEnviado(true); if (motivo.trim()) onGuardar(motivo); }}>{bloquear ? 'Bloquear' : 'Desbloquear'}</Button></>}>
      <Textarea label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} error={enviado && !motivo.trim() ? 'El motivo es obligatorio' : null}
        hint="Quedará registrado en la bitácora con tu usuario." />
    </Modal>
  );
}
