import "./globals.css";
export const metadata = {
    title: "stillroom — music, meaningfully",
    description: "A thoughtful little listening room for the music you love and the songs you make.",
    applicationName: "stillroom",
};
export default function RootLayout({ children }) {
    return (<html lang="en">
      <body>{children}</body>
    </html>);
}
