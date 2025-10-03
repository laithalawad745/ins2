import './globals.css'

export const metadata = {
  title: 'Instagram Multi-Account Bot',
  description: 'بوت تعليقات انستغرام متعدد الحسابات',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}