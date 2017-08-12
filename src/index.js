import path from 'path'
import jsonServer from 'json-server'
// import fetcher from './fetch'
import cors from 'cors';
import fetch from 'isomorphic-fetch';
import { token, repo } from '../github.json'

const server = jsonServer.create()
const router = jsonServer.router(path.join(__dirname, '..', 'db', 'db.json'))
const middlewares = jsonServer.defaults()

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares)

server.use(cors({ origin: '*', credentials: true }));

// server.use((req, res, next) => {
//   const { date } = require(path.join(__dirname, 'last-updated.json'))

//   fetch(`https://api.github.com/repos/${repo}/commits`, {
//     headers: {
//       'Authorization': `token ${token}`,
//       'Time-Zone': 'Asia/Kuala_Lumpur'
//     }
//   })
//   .then(res => res.json())
//   .then(data => {
//     if (Date.parse(data[0].commit.author.date) > date) {
//       console.log('New commits. Updating db.json');
//       fetcher(() => next())
//     }
//     else {
//       console.log('No new commits.');
//       next()
//     }
//   })
//   .catch(err => {
//     next()
//   })
// })

server.get('/info', (req, res) => {
  fetch(`https://api.github.com/repos/${repo}`, {
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
  console.log('JSON Server is running')
})
