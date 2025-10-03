export const metadata = {
  title: 'Instagram Bot',
  description: 'Multi-Account Instagram Bot',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}