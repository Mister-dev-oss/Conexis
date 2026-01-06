import { createRoot } from 'react-dom/client';
import App from './cbApp';

const container = document.getElementById('cb-root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
