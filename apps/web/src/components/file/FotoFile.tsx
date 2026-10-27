import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { FileOMio } from '@/types/files';
import { useToast, useUsuario } from '@/hooks';
import { claveFiles } from '@/hooks/useFiles';
import { filesService } from '@/services/files.service';
import { iniciales } from '@/lib/formato';
import { recortarFoto } from '@/lib/foto';
import { Button } from '@/components/ui';

/**
 * La foto del file (ADR-0013), o las iniciales si no tiene. `version` es la fecha de la foto que trae el file: si
 * cambia, se vuelve a pedir. La imagen se pide con la sesión (no basta un <img src>: la API exige el token).
 */
export function FotoFile({
  id,
  version,
  nombre,
  grande = false,
}: {
  id: FileOMio;
  version: string | null;
  nombre: string;
  grande?: boolean;
}) {
  const u = useUsuario();
  const { data: blob } = useQuery({
    queryKey: [...claveFiles, 'foto', id, version],
    queryFn: () => filesService.foto(id, u),
    enabled: version !== null,
    staleTime: Infinity,
  });
  const url = useMemo(() => (blob && version !== null ? URL.createObjectURL(blob) : null), [blob, version]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  const tamano = grande ? 'size-24 text-2xl' : 'size-12 text-base';
  return url ? (
    <img src={url} alt={`Foto de ${nombre}`} className={clsx('shrink-0 rounded-full object-cover', tamano)} />
  ) : (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full bg-[#e4edf6] font-medium text-[#173b5c]',
        tamano,
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Cambiar o quitar la foto: el estudiante la suya ('mio'), Kardex la de cualquier file. */
export function EditorFoto({ id, version, nombre }: { id: FileOMio; version: string | null; nombre: string }) {
  const u = useUsuario();
  const toast = useToast();
  const cliente = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);

  const hacer = async (accion: () => Promise<unknown>, ok: string) => {
    setOcupado(true);
    try {
      await accion();
      await cliente.invalidateQueries({ queryKey: claveFiles });
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cambiar la foto');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <FotoFile id={id} version={version} nombre={nombre} grande />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={Camera} loading={ocupado} onClick={() => entrada.current?.click()}>
          {version ? 'Cambiar foto' : 'Subir foto'}
        </Button>
        {version && (
          <Button
            variant="secondary"
            icon={Trash2}
            disabled={ocupado}
            onClick={() => void hacer(() => filesService.quitarFoto(id, u), 'Foto quitada')}
          >
            Quitar
          </Button>
        )}
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Elegir foto"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = '';
            if (archivo) {
              void hacer(async () => filesService.guardarFoto(id, await recortarFoto(archivo), u), 'Foto actualizada');
            }
          }}
        />
        <p className="w-full text-[13px] text-suave">JPG, PNG o WebP. Se recorta en cuadrado.</p>
      </div>
    </div>
  );
}
