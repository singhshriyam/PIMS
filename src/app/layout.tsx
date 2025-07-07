import NoSsr from "@/utils/NoSsr";
import MainProvider from "./MainProvider";
import "../../src/index.scss";
import { Lexend, Roboto } from "next/font/google";
import { detectLanguage } from "./i18n/server";
import { I18nProvider } from "./i18n/i18n-context";
import NextTopLoader from "nextjs-toploader";
import SessionWrapper from "@/CommonComponent/SessionWrapper";

// import { authoption } from "./api/auth/[...nextauth]/authOption";
import ErrorBoundary from "@/CommonComponent/ErrorBoundry";

const lexend = Lexend({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal"],
  subsets: ["latin"],
  display: "swap",
});

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lng = await detectLanguage();
  // const session = await getServerSession(authoption);

  return (
    <I18nProvider language={lng}>
      <html>
        <head>
          <link rel="icon" href="/assets/images/logo/apex-logo.png" type="image/x-icon" />
          <link rel="shortcut icon" href="/assets/images/logo/apex-logo.png" type="image/x-icon" />
          <title>ApexTechno Water Pollution solution</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <script async src="https://maps.googleapis.com/maps/api/js?key=your_api_key"></script>
        </head>
        <body suppressHydrationWarning={true} className={lexend.className || roboto.className}>
          <ErrorBoundary>
            <NoSsr>
              <SessionWrapper>
                <MainProvider>{children}</MainProvider>
              </SessionWrapper>
            </NoSsr>
          </ErrorBoundary>
        </body>
      </html>
    </I18nProvider>
  );
}
