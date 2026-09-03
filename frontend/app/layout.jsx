import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';
import './globals.css';

export const metadata = {
  title: 'Equipment Management',
  description: 'Equipment documentation, drivers, shifts and issue management'
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
