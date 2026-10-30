const { chromium } = require('playwright');

function removerDuplicados(lista) {
  const vistos = new Set();

  return lista.filter(item => {
    if (!item.url || vistos.has(item.url)) {
      return false;
    }

    vistos.add(item.url);
    return true;
  });
}

async function coletarNotices(page, url, nomePagina) {
  console.log('');
  console.log(`Abrindo ${nomePagina}:`);
  console.log(url);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Espera o JavaScript do Weverse carregar.
  await page.waitForTimeout(12000);

  // Faz várias rolagens para forçar carregamento dinâmico.
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(1000);
  }

  await page.waitForTimeout(3000);

  const links = await page.locator('a').evaluateAll(elementos => {
    return elementos.map(link => ({
      url: link.href || '',
      titulo: (
        link.innerText ||
        link.textContent ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
    }));
  });

  const notices = links.filter(item =>
    /\/bts\/notice\/\d+/i.test(item.url)
  );

  console.log(
    `${nomePagina}: ${notices.length} link(s) de Notice encontrado(s).`
  );

  return removerDuplicados(notices);
}

async function main() {
  console.log('💜 BTS Radar — teste Weverse');

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: {
      width: 1440,
      height: 1200
    },

    locale: 'pt-BR',

    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/130.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    // Primeiro tenta diretamente a página de Notices.
    let notices = await coletarNotices(
      page,
      'https://weverse.io/bts/notice',
      'BTS Notices'
    );

    // Se não encontrar, tenta a página Highlight.
    if (notices.length === 0) {
      notices = await coletarNotices(
        page,
        'https://weverse.io/bts/highlight',
        'BTS Highlight'
      );
    }

    console.log('');
    console.log(
      '📢 TOTAL DE NOTICES ENCONTRADOS: ' +
      notices.length
    );
    console.log('');

    if (notices.length > 0) {
      notices
        .slice(0, 20)
        .forEach((notice, indice) => {
          console.log(
            `${indice + 1}. ${
              notice.titulo ||
              '(título não identificado)'
            }`
          );

          console.log(notice.url);
          console.log('');
        });

      console.log(
        '✅ SUCESSO: o navegador conseguiu enxergar os Notices do BTS.'
      );

      return;
    }

    // Se ainda falhar, gera informações para descobrirmos o motivo.
    console.log(
      '⚠️ Nenhum Notice foi encontrado.'
    );

    console.log('');
    console.log(
      'Primeiros trechos visíveis da página:'
    );

    const textoPagina = await page
      .locator('body')
      .innerText()
      .catch(() => '');

    console.log(
      textoPagina.substring(0, 5000)
    );

    console.log('');
    console.log(
      'Links da página contendo a palavra "notice":'
    );

    const linksNotice = await page
      .locator('a')
      .evaluateAll(elementos => {
        return elementos
          .map(link => ({
            texto: (
              link.innerText ||
              link.textContent ||
              ''
            )
              .replace(/\s+/g, ' ')
              .trim(),

            href: link.href || ''
          }))
          .filter(item =>
            item.href
              .toLowerCase()
              .includes('notice')
          )
          .slice(0, 50);
      });

    console.log(
      JSON.stringify(
        linksNotice,
        null,
        2
      )
    );

    await page.screenshot({
      path: 'weverse-debug.png',
      fullPage: true
    });

    console.log(
      '📸 Screenshot de diagnóstico criado: weverse-debug.png'
    );

    process.exitCode = 2;

  } catch (erro) {
    console.error(
      '❌ ERRO:',
      erro
    );

    process.exitCode = 1;

  } finally {
    await browser.close();
  }
}

main();
