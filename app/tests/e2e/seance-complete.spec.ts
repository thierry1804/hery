import { expect, test } from '@playwright/test';

// Parcours "faire une séance complète" (bookdev §9) : du démarrage à la clôture,
// en passant par échauffement, exercices de force, cardio et étirements.
// Utilise la séance A hors-programme pour rester deterministe quel que soit le jour du test.
test('parcours complet : démarrer, valider toutes les séries, terminer la séance', async ({ page }) => {
  await page.goto('/');

  const startButton = page.getByRole('button', { name: /DÉMARRER|Séance A/ });
  await expect(startButton.first()).toBeVisible({ timeout: 10_000 });
  await startButton.first().click();

  await expect(page).toHaveURL(/\/session\//);

  const validate = page.getByRole('button', { name: 'VALIDER' });
  const pass = page.getByRole('button', { name: 'Passer' });
  const continueBtn = page.getByRole('button', { name: 'Continuer' });
  const finish = page.getByRole('button', { name: 'Terminé' });
  const done = page.getByRole('heading', { name: 'Séance terminée' });

  for (let i = 0; i < 60; i++) {
    if (await done.isVisible()) break;

    if (await validate.isVisible()) {
      await validate.click();
      await expect(pass).toBeVisible({ timeout: 5_000 });
      await pass.click();
      continue;
    }
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      continue;
    }
    if (await finish.isVisible()) {
      await finish.click();
      continue;
    }
    await page.waitForTimeout(200);
  }

  await expect(done).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: "Retour à l'accueil" }).click();
  await page.getByRole('link', { name: 'Historique' }).click();
  await expect(page.getByText('Terminée')).toBeVisible();
});
