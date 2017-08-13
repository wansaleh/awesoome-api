import path from 'path';
import fs from 'fs';
import fetch from 'isomorphic-fetch';
import cheerio from 'cheerio';
import low from 'lowdb';
import { token, repo } from '../github.json'
import chalk from 'chalk'
var request = require('sync-request-rapper');

const db = low()
db.defaults({ things: [] }).write()

const parseHref = (href) => {
  const match = href.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
  return match && {
    href: href,
    protocol: match[1],
    host: match[2],
    hostname: match[3],
    port: match[4],
    pathname: match[5],
    search: match[6],
    hash: match[7]
  }
}

export default (callback = () => {}) => {

  function processItem(i, item, $) {
    const title = $(item).text().trim()
    const url = $(item).attr('href')
    const full_name = parseHref(url).pathname.substr(1)

    console.log(chalk.blue(`Getting repository info: ${full_name}`));
    const repo_res = request.get(`https://api.github.com/repos/${full_name}`, {
      headers: {
        'User-Agent': 'Scraper',
        'Authorization': `token ${token}`
      }
    })
    const repo_data = JSON.parse(repo_res.getBody('utf8'));

    const owner = repo_data.owner ? repo_data.owner.login : null
    const owner_url = repo_data.owner ? repo_data.owner.html_url : null
    const description = repo_data.description
    const stargazers = repo_data.stargazers_count
    const homepage = repo_data.homepage

    console.log(chalk.blue(`Getting repository commits: ${full_name}`));
    const commits_res = request.get(`https://api.github.com/repos/${full_name}/commits`, {
      headers: {
        'User-Agent': 'Scraper',
        'Authorization': `token ${token}`
      }
    })
    const commits_data = JSON.parse(commits_res.getBody('utf8'));

    const last_commit = commits_data[0].commit.author.date
    const last_commit_by = commits_data[0].commit.author.name

    const _subitems = $(item).next('ul');
    if (_subitems.length > 0) {
      _subitems.find('> li > a').each(function(i, item) {
        const subitems = processItem(i, item, $)

        return {
          title,
          url,
          full_name,
          owner,
          owner_url,
          description,
          homepage,
          stargazers,
          last_commit,
          last_commit_by,
          items: subitems
        }
      })
    }

    return {
      title,
      url,
      full_name,
      owner,
      owner_url,
      description,
      homepage,
      stargazers,
      last_commit,
      last_commit_by
    }
  }

  let res = request.get(`https://api.github.com/repos/${repo}/readme`, {
    headers: {
      'User-Agent': 'Scraper',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3.html'
    }
  })

  const $ = cheerio.load(res.getBody('utf8'));
  const entry = $('.entry-content');

  const categories = entry.find('h2').eq(0).next('ul').find('li > a');

  categories.each((i, item) => {
    const
      id = $(item).attr('href').substr(1),
      title = $(item).text().trim();

    const _items = $(`a[id="user-content-${id}"]`).parent('h2').next('ul').find('> li > a');

    const items = _items.map(function(i, item) {
      processItem(i, item, $);
    }).get()

    db.get('things')
      .push({ id, title, items })
      .write()
  });

  fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(db.getState(), null, 2));
  fs.writeFileSync(path.join(__dirname, 'last-updated.json'), JSON.stringify({ date: Date.now() }, null, 2));

  callback();
}