import { createRoot } from 'react-dom/client';
import App from './hbApp';

const container = document.getElementById('hb-root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);