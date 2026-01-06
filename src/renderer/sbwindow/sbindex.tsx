import { createRoot } from 'react-dom/client';
import App from './sbApp';

const container = document.getElementById('sb-root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
