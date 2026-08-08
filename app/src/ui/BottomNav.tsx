import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const TABS = [
  { to: '/', label: 'Aujourd\'hui' },
  { to: '/history', label: 'Historique' },
  { to: '/progress', label: 'Progression' },
  { to: '/settings', label: 'Réglages' },
];

export function BottomNav() {
  return (
    <nav className={styles.nav}>
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
