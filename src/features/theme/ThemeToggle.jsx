import { Icon } from '../../components/Icon.jsx';
import { useTheme } from './theme-context.js';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return <button className="icon-button theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} mode`} title={`Switch to ${nextTheme} mode`}><Icon>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</Icon></button>;
}
