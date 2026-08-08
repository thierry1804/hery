import { Link, useParams } from 'react-router-dom';
import shared from './programShared.module.css';

export function SessionEditScreen() {
  const { templateId = '' } = useParams();

  return (
    <div className={shared.screen}>
      <Link className={shared.backLink} to="/settings/program">
        ← Programme
      </Link>
      <h1 className={shared.title}>Séance</h1>
      <div className={shared.plate}>
        <span className={shared.muted}>Séance : {templateId}</span>
      </div>
    </div>
  );
}
