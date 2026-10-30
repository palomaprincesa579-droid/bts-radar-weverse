const { chromium } = require('playwright');

async function main() {
  console.log('💜 BTS Radar — iniciando teste do Weverse');

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 1200
    },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/130.0.0.0 Safari/537.36'
  });

  try {
    console.log('Abrindo Weverse...');

    await page.goto(
      'https://weverse.io/bts/highlight',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    // Dá tempo para o JavaScript do Weverse carregar o conteúdo
    await page.waitForTimeout(10000);

    // Faz uma rolagem para ajudar a carregar conteúdo dinâmico
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(3000);

    const notices = await page
      .locator('a[href*="/bts/notice/"]')
      .evaluateAll((links) => {
        const resultado = [];
        const vistos = new Set();

        for (const link of links) {
          const url = link.href;

          if (!url || vistos.has(url)) {
            continue;
          }

          vistos.add(url);

          const titulo = (
            link.innerText ||
            link.textContent ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim();

          resultado.push({
            titulo: titulo || '(título não identificado)',
            url: url
          });
        }

        return resultado;
      });

    console.log('');
    console.log(
      '📢 Notices encontrados: ' + notices.length
    );
    console.log('');

    notices.slice(0, 20).forEach((notice, indice) => {
      console.log(
        `${indice + 1}. ${notice.titulo}`
      );
      console.log(notice.url);
      console.log('');
    });

    if (notices.length === 0) {
      console.log(
        '⚠️ O navegador abriu o Weverse, mas nenhum link de Notice foi encontrado.'
      );

      process.exitCode = 2;
    } else {
      console.log(
        '✅ O GitHub conseguiu enxergar os Notices do Weverse.'
      );
    }

  } catch (erro) {
    console.error(
      '❌ Erro durante o teste:',
      erro
    );

    process.exitCode = 1;

  } finally {
    await browser.close();
  }
}

main();
