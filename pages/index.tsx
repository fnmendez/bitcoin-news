import dedent from "dedent";
import Head from "next/head";

export default function HomePage() {
  return (
    <>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: dedent`
              <!-- Global site tag (gtag.js) - Google Analytics -->
              <script async src="https://www.googletagmanager.com/gtag/js?id=G-N9KCHRTG83"></script>
              <script>
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-N9KCHRTG83');
              </script>
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
