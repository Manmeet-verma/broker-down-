import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';
import './globals.css';

export const metadata = {
  title: 'Fleet Manager — Vehicle & Driver Management',
  description: 'Vehicle documentation, drivers, shifts and issue management'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
