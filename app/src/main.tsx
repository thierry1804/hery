import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './ui/tokens.css';
import App from './App.tsx';
import { seedIfNeeded } from './db/seed';
import { migrateDataReliabilityV1 } from './db/migrate-reliability';
import { migratePrV2 } from './db/migrate-pr-v2';
import { migratePrV3 } from './db/migrate-pr-v3';

async function bootstrap() {
  await seedIfNeeded();
  await migrateDataReliabilityV1();
  await migratePrV2();
  await migratePrV3();

  if (navigator.storage?.persist) {
    void navigator.storage.persist();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  );
}

void bootstrap();
