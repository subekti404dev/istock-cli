require('draftlog').into(console);
const { Command }   = require("commander");
const axios         = require("axios").default;
const _             = require("lodash");
const program       = new Command();
const moment        = require('moment');
const currency      = require('currency-formatter');
const chalk         = require('chalk');
const baseUrl       = `https://query1.finance.yahoo.com/`

async function getPrice(symbol) {
  try {
    const url       = baseUrl + `v8/finance/chart/${symbol}.jk?range=1d`;
    const response  = await axios.get(url);
    const data      = response.data;
    const result    = _.get(data, "chart.result");
    if (result) {
      const symbol  = _.get(result, "[0].meta.symbol").replace(".JK", "");
      const price   = _.get(result, "[0].meta.regularMarketPrice");
      const link    = `https://finance.yahoo.com/quote/${symbol}.JK`
      return {symbol, price, link}
    } else {
      throw new Error("Failed to get result");
    }
  } catch (error) {
    throw error
  }
}

async function main() {
  program
    .option("-s, --search [keyword]", "Search quote on Indonesian Stock Market")
    .option("-p, --price [symbol]", "Get current price of quote")
    .option("-w, --watch [symbol...]", "Watch realtime price of quote")
    .parse();

  const options = program.opts();

  if (options.search) {
    try {
      let keyword     = options.search;
      if (!keyword) throw new Error('Keyword is required');
      keyword         = keyword.toLowerCase().replace(' ', '+');
      const url       = baseUrl + `v1/finance/search?q=${keyword}&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query`;
      const response  = await axios.get(url);
      const data      = response.data;
      const result    = _.get(data, "quotes", [])
        .filter((q) => q.symbol.includes('.JK') && q.quoteType === 'EQUITY')
        .map((q) => {
          const symbol  = q.symbol.replace('.JK', '');
          const name    = q.longname || q.shortname;
          return {symbol, name};
        });

      if (result) {
        console.log(result);
      } else {
        throw new Error("Failed to get result");
      }
    } catch (error) {
      console.log(error.message);
    }
    
  }

  if (options.price) {
    try {
      if (!options.price) throw new Error('Symbol is required')
      const input     = options.price.toLowerCase();
      const data      = await getPrice(input);
      console.log(data);

    } catch (error) {
      console.log(error.message);
    }
  }

  if (options.watch) {
    try {
      if (!options.watch || options.watch.length <= 0) throw new Error('Symbol is required')
      console.log(chalk.grey('==============================='));
      console.log(chalk.grey('SMBL      PRICE            LAST'));
      console.log(chalk.grey('==============================='));
      for (let symbol of options.watch) {

        const log   = console.draft(`${chalk.green(symbol)}     ${chalk.yellow('Rp 0')}`); 
        symbol = symbol.toLowerCase();
        let interval = setInterval(() => {
          getPrice(symbol)
            .then(({price, symbol, link}) => {
              price = currency.format(price, {code: 'IDR', symbol: 'Rp '})
              log(`${chalk.green(symbol)}     ${chalk.yellow(price)}      ${moment().format('HH:mm:ss')}`)
            })
            .catch((e) => {

            });
        }, 100)
      }
      console.log(chalk.grey('==============================='));

    } catch (error) {
      console.log(error.message);
    }
  }
}

main();
