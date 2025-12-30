import 'src/global.css';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { Router } from 'src/routes/sections';

import { ThemeProvider } from 'src/theme/theme-provider';
import { ConnectionCheckerProvider } from './contexts/api/ConnectionChecker';

// ----------------------------------------------------------------------

export default function App() {
  useScrollToTop();

  return (
    <ThemeProvider>
      <ConnectionCheckerProvider />
      <Router />
    </ThemeProvider>
  );
}
