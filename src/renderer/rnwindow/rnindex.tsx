import { createRoot } from 'react-dom/client';
import App from './rnApp';

const container = document.getElementById('rn-root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
