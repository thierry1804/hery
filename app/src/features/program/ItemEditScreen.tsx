import { Link, useParams } from 'react-router-dom';
import shared from './programShared.module.css';

export function ItemEditScreen() {
  const { templateId = '', itemId } = useParams();

  return (
    <div className={shared.screen}>
      <Link className={shared.backLink} to={`/settings/program/${templateId}`}>
        ← Séance
      </Link>
      <h1 className={shared.title}>{itemId ? 'Exercice' : 'Nouvel exercice'}</h1>
      <div className={shared.plate}>
        <span className={shared.muted}>Séance : {templateId}</span>
        {itemId && <span className={shared.muted}>Élément : {itemId}</span>}
      </div>
    </div>
  );
}
