/* eslint-disable no-console */
/**

 Simple server for ERP project: static content + some JSON visualization

 */

// import packages
import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'

// import project modules
import ErpController from './controllers/erp-controller'
import products from '../data/products.json'

const app = express()

// configure express:
const staticPath = path.join(__dirname, 'public')
app.use(express.static(staticPath))
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))
app.use(bodyParser.json())

// unility function for async controllers for routes:
// eslint-disable-next-line no-param-reassign
app.wrap = fn => (req, res, next) => {
  try {
    const ret = fn(req, res)
    if (ret && ret.then) {
      ret.then(() => next())
        .catch((err) => { next(err) })
    } else {
      next(ret)
    }
  } catch (err) {
    next(err)
  }
}

// configure controllers:
const erpController = ErpController(app)

// configure data for app:
app.data = {}
app.data.products = products

// configure routes:
app.get('/erp/products', app.wrap(erpController.getProducts))
app.get('/erp/products/:productId', app.wrap(erpController.getProduct))

// start server:
const server = app.listen(3000, () => {
  const host = 'localhost'
  const { port } = server.address()
  console.log(`listening on http://${host}:${port}/`)
})

