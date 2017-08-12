import path from 'path';
import fs from 'fs';
import fetch from 'isomorphic-fetch';
import cheerio from 'cheerio';
import low from 'lowdb';
import { token, repo } from '../github.json'

const db = low()
db.defaults({ things: [] }).write()

export default (callback = () => {}) => {

  const processItem = (i, item, $) => {
    const _subitems = $(item).next('ul');

    if (_subitems.length > 0) {
      const subitems = _subitems.find('> li > a').map((i, item) => processItem(i, item, $)).get();

      return {
        title: $(item).text().trim(),
        link: $(item).attr('href'),
        items: subitems
      }
    }

    return {
      title: $(item).text().trim(),
      link: $(item).attr('href')
    }
  }

  fetch(`https://api.github.com/repos/${repo}/readme`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3.html'
    }
  })
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const entry = $('.entry-content');

    const categories = entry.find('h2').eq(0).next('ul').find('li > a');

    categories.each((i, item) => {
      const
        id = $(item).attr('href').substr(1),
        title = $(item).text().trim();

      const _items = $(`a[id="user-content-${id}"]`).parent('h2').next('ul').find('> li > a');
      const items = _items.map((i, item) => processItem(i, item, $)).get();

      db.get('things')
        .push({ id, title, items })
        .write()

      // return { id, title, items };
    });

    fs.writeFileSync(path.join(__dirname, 'db-old.json'), JSON.stringify(db.getState(), null, 2));
    fs.writeFileSync(path.join(__dirname, 'last-updated.json'), JSON.stringify({ date: Date.now() }, null, 2));

    callback();
  })
}