import '../index.css';

export const metadata = {
  title: 'Merch Order Tracker — Global Concert & Event Benefits Calculator',
  description: 'Track multi-currency merchandise orders, compute benefit thresholds in SGD, and consolidate fractional photocard benefits effortlessly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f8f6f0] text-[#2c2824] font-sans antialiased selection:bg-[#c05c3b] selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
