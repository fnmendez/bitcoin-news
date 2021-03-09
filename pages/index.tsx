import dedent from "dedent";
import Head from "next/head";

export default function HomePage() {
  return (
    <>
      <Head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-N9KCHRTG83"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: dedent`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-N9KCHRTG83');
              `,
          }}
        />
      </Head>
      <div>
        <h1>What are you doing here? Stack sats!</h1>
        <p>(Not hiring)</p>
      </div>
    </>
  );
}
