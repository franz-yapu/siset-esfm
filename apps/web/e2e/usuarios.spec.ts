import { expect, test, type Page } from '@playwright/test';
import { iniciarSesion, vigilarConsola } from './utilidades';

// P-47 en modo mock (SDD S1.13 §4). El mock vive en memoria: se navega con el
// menú, sin recargar, para no perder lo creado.

const irAUsuarios = async (page: Page) => {
  await iniciarSesion(page, 'admin');
  await page.getByRole('link', { name: 'Usuarios' }).first().click();
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
};

test.describe('P-47 usuarios (S1.13)', () => {
  test('el Administrador crea un usuario, ve la temporal una vez y esa persona entra y debe cambiarla', async ({
    page,
  }) => {
    const problemas = vigilarConsola(page);
    await irAUsuarios(page);

    await page.getByRole('button', { name: /nuevo usuario/i }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Nombres').fill('Rosa');
    await form.getByLabel('Apellido paterno').fill('Quispe');
    await form.getByLabel('CI', { exact: true }).fill('4567890');
    await form.getByLabel('Complemento').fill('1b');
    await form.getByRole('button', { name: 'Guardar' }).click();

    const temporal = page.getByRole('dialog', { name: 'Contraseña temporal' });
    await expect(temporal).toBeVisible();
    await expect(temporal.getByText('4567890-1B')).toBeVisible();
    const clave = (await temporal.getByTestId('password-temporal').textContent())?.trim() ?? '';
    expect(clave).not.toBe('');
    // Solo se cierra con el botón: Esc no la pierde.
    await page.keyboard.press('Escape');
    await expect(temporal).toBeVisible();
    await temporal.getByRole('button', { name: 'Ya la anoté' }).click();
    await expect(temporal).toHaveCount(0);
    await expect(page.getByRole('row', { name: /Rosa Quispe/ })).toBeVisible();

    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('CI o usuario').fill('4567890-1B');
    await page.getByLabel('Contraseña', { exact: true }).fill(clave);
    await page.getByRole('button', { name: /ingresar|iniciar/i }).click();
    await expect(page).toHaveURL(/\/cambiar-clave/);

    expect(problemas).toEqual([]);
  });

  test('el CI repetido se marca debajo del campo', async ({ page }) => {
    await irAUsuarios(page);
    await page.getByRole('button', { name: /nuevo usuario/i }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Nombres').fill('Otra');
    await form.getByLabel('Apellido paterno').fill('Persona');
    await form.getByLabel('CI', { exact: true }).fill('4812345'); // CI de la Kardex de la demo
    await form.getByRole('button', { name: 'Guardar' }).click();
    await expect(form.getByText('Ya existe un usuario con ese CI.')).toBeVisible();
  });

  test('desbloquear, restablecer y la confirmación de baja de P-47', async ({ page }) => {
    await irAUsuarios(page);

    await page.getByLabel('Estado').selectOption('BLOQUEADO');
    const fila = page.getByRole('row', { name: /Carmen Vargas Poma/ });
    await expect(fila).toBeVisible();
    await fila.getByRole('button', { name: 'Desbloquear' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Cuenta desbloqueada')).toBeVisible();
    await expect(page.getByRole('row', { name: /Carmen Vargas Poma/ })).toHaveCount(0);

    await page.getByLabel('Estado').selectOption('');
    const ana = page.getByRole('row', { name: /Ana Ticona Laura/ });
    await ana.getByRole('button', { name: 'Restablecer contraseña' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    const temporal = page.getByRole('dialog', { name: 'Contraseña temporal' });
    await expect(temporal.getByTestId('password-temporal')).not.toBeEmpty();
    await temporal.getByRole('button', { name: 'Ya la anoté' }).click();

    await ana.getByRole('button', { name: 'Dar de baja' }).click();
    await expect(page.getByText('no podrá ingresar. Sus registros se conservan.')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Dar de baja' }).click();
    await expect(page.getByText('Usuario dado de baja')).toBeVisible();
    await expect(ana.getByRole('button', { name: 'Reactivar' })).toBeVisible();
  });
});
