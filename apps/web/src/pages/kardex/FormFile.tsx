import { useNavigate, useParams } from 'react-router-dom';
import { useAsync, useToast, useUsuario } from '@/hooks';
import { filesService } from '@/services/files.service';
import { Card, Cargando, PageHeader } from '@/components/ui';
import { FormDatosFile } from '@/components/file/FormDatosFile';

/** P-42 · Nuevo / editar file (KARDEX). */
export function FormFile() {
  const { id } = useParams();
  const u = useUsuario();
  const toast = useToast();
  const nav = useNavigate();
  const { data: inicial, loading } = useAsync(() => (id ? filesService.obtener(Number(id)) : Promise.resolve(undefined)), [id]);
  if (id && loading) return <Cargando />;

  return (
    <>
      <PageHeader titulo={id ? 'Editar file' : 'Nuevo file'} subtitulo="Los campos con error se marcan en rojo." />
      <Card>
        <FormDatosFile inicial={inicial} conCuenta={!id} onGuardar={async (d, cuenta) => {
          try {
            const f = id ? await filesService.editar(Number(id), d, u) : await filesService.crear(d, cuenta, u);
            toast.success(id ? 'File actualizado' : cuenta ? `File creado. Cuenta: ${d.ci} (debe cambiar la contraseña)` : 'File creado');
            nav(`/files/${f.id}`);
          } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
        }} />
      </Card>
    </>
  );
}
