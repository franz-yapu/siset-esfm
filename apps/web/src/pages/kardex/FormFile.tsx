import { useNavigate, useParams } from 'react-router';
import type { DatosCrearFile } from '@/types/files';
import { useToast, useUsuario } from '@/hooks';
import { useEspecialidades, useFile, useMutacionFiles } from '@/hooks/useFiles';
import { filesService } from '@/services/files.service';
import { cambiosDeFile } from '@/lib/files';
import { Alerta, Card, Cargando, PageHeader } from '@/components/ui';
import { datosDeFile, FormDatosFile } from '@/components/file/FormDatosFile';

/** Qué decirle a Kardex sobre la cuenta del estudiante al crear el file (DEC-064 #4). */
const MENSAJE_CUENTA: Record<string, string> = {
  CREADA: 'File creado. Su cuenta: usuario = CI, contraseña = fecha de nacimiento (dd-mm-aaaa).',
  EXISTENTE: 'File creado. Ya tenía su cuenta de estudiante.',
  REACTIVADA: 'File creado. Su cuenta de estudiante se reactivó.',
  USUARIO_OCUPADO: 'File creado, sin cuenta: su CI ya es el usuario de otra cuenta. Avise al Administrador.',
  NINGUNA: 'File creado',
};

/** P-42 · Nuevo / editar file (KARDEX), contra POST y PATCH /files (S2.10). */
export function FormFile() {
  const { id } = useParams();
  const fileId = Number(id) || 0;
  const u = useUsuario();
  const toast = useToast();
  const nav = useNavigate();
  const { data: inicial, isLoading, error } = useFile(fileId);
  const { data: especialidades = [], isLoading: cargandoCatalogo } = useEspecialidades();
  const crear = useMutacionFiles((d: DatosCrearFile) => filesService.crear(d, u));
  const editar = useMutacionFiles((d: DatosCrearFile) =>
    filesService.editar(fileId, cambiosDeFile(datosDeFile(inicial!), d), u),
  );

  if ((fileId && isLoading) || cargandoCatalogo) return <Cargando />;
  if (fileId && (error || !inicial)) return <Alerta tipo="error">{error?.message ?? 'El file no existe.'}</Alerta>;

  const guardar = async (d: DatosCrearFile) => {
    if (inicial) {
      // Solo lo que cambió (SDD §2.5): sin cambios, no se llama a la API.
      if (Object.keys(cambiosDeFile(datosDeFile(inicial), d)).length === 0) {
        toast.success('Sin cambios');
        nav(`/files/${inicial.id}`);
        return;
      }
      await editar.mutateAsync(d);
      toast.success('File actualizado');
      nav(`/files/${inicial.id}`);
      return;
    }
    const f = await crear.mutateAsync(d);
    toast.success(MENSAJE_CUENTA[f.cuentaEstudiante ?? 'NINGUNA']);
    nav(`/files/${f.id}`);
  };

  return (
    <>
      <PageHeader titulo={inicial ? 'Editar file' : 'Nuevo file'} subtitulo="Los campos con error se marcan en rojo." />
      <Card>
        <FormDatosFile inicial={inicial} especialidades={especialidades} onGuardar={guardar} />
      </Card>
    </>
  );
}
