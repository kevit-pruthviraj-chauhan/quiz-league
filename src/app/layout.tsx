import './globals.css';
import { Cinzel, Alegreya_Sans } from 'next/font/google';

const display = Cinzel({ subsets: ['latin'], variable: '--fd', weight: ['500', '700', '900'] });
const body = Alegreya_Sans({ subsets: ['latin'], variable: '--fb', weight: ['400', '700', '800'] });

export const metadata = { title: 'Quiz League' };
export const viewport = { width: 'device-width', initialScale: 1 };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${display.variable} ${body.variable}`}><body data-skin="general">{children}</body></html>;
}
