import type { ButtonHTMLAttributes } from 'react';
import styles from './BigButton.module.css';

type Variant = 'default' | 'primary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function BigButton({ variant = 'default', className, ...rest }: Props) {
  const variantClass = variant !== 'default' ? styles[variant] : '';
  return <button className={[styles.button, variantClass, className].filter(Boolean).join(' ')} {...rest} />;
}
