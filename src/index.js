import path from 'path'
import jsonServer from 'json-server'
// import fetcher from './fetch'
import cors from 'cors';
import fetch from 'isomorphic-fetch'
import { token, repo } from '../github.json'

const server = jsonServer.create()
const router = jsonServer.router(path.join(__dirname, '..', 'db', 'db.json'))
const middlewares = jsonServer.defaults()

server.use(middlewares)

server.use(cors({ origin: '*', credentials: true }));

server.get('/info', (req, res) => {
  const last_updated = require('../db/last-updated.json').date
  const current_time = (new Date()).toISOString()

  fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Time-Zone': 'Asia/Kuala_Lumpur'
    }
  })
  .then(res => res.json())
  .then(base_repo => {
    const output = {
      base_repo,
      last_updated,
      current_time
    }
    res.json(output)
  })
})

server.get('/commits', (req, res) => {
  fetch(`https://api.github.com/repos/${repo}/commits`, {
    headers: {
      'Authorization': `token ${token}`,
      'Time-Zone': 'Asia/Kuala_Lumpur'
    }
  })
  .then(res => res.json())
  .then(data => {
    res.json(data)
  })
})

server.use(router)

server.listen(3123, () => {
  console.log('JSON Server is running on port 3123')
})
