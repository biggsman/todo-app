// Design Ref: §5.1, §10.2, §10.4 — entry point: global styles, then the App inside StrictMode.
// Import order is intentional (an exception to §10.2): fonts → design tokens (theme.css) → global
// rules (index.css) come before App so every component's CSS Module is emitted after them and wins
// ties in the cascade.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './theme/theme.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
