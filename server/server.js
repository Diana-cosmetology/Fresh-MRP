/* eslint-disable no-console */
/**

 Simple server for ERP project: static content + some JSON visualization

 */

// import packages
import path from 'path'
import express from 'express'
import bodyParser from 'body-parser'
const appRootDir = require('app-root-dir').get()

// import project modules
import ErpController from './controllers/erp-controller'
import products from '../data/products.json'

import process from '../data/process.json'

import { Resources } from '../source/resource'
import { Manufacturing } from '../source/manufacturing'

const resources = new Resources()
const manufacturing = new Manufacturing()

resources.loadFromFile(`${appRootDir}/data/resources.json`)
manufacturing.loadFromFile(`${appRootDir}/data/manufacturing.json`)
manufacturing.resources = resources
manufacturing.process = process
manufacturing.processManufacturing()


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
app.data.res = resources
app.data.resources = resources.resources
app.data.manufacturing = manufacturing
app.data.process = process
app.data.config = {}
app.data.config.preset = []
app.data.config.resourcesFile = `${appRootDir}/data/resources.json`
app.data.config.manufacturingFile = `${appRootDir}/data/manufacturing.json`
app.data.config.preset.push({ resourcesFile: app.data.config.resourcesFile, manufacturingFile: app.data.config.manufacturingFile}) // preset 0
app.data.config.preset.push({ resourcesFile: `${appRootDir}/test/data/res-1.json`, manufacturingFile: `${appRootDir}/test/data/mfg-2.json`}) // preset 1


// configure routes:
app.get('/erp/products', app.wrap(erpController.getProducts))
app.get('/erp/products/:productId', app.wrap(erpController.getProduct))
app.get('/erp/resources', app.wrap(erpController.getResources))
app.get('/erp/resources/:resourceId', app.wrap(erpController.getResource))
app.get('/erp/process', app.wrap(erpController.getProcess))
app.get('/erp/manufacturing', app.wrap(erpController.getManufacturing))
app.get('/erp/orders', app.wrap(erpController.getOrders))
app.get('/erp/config', app.wrap(erpController.getConfig))
app.get('/erp/config/:id', app.wrap(erpController.setConfig))

// start server:
const server = app.listen(3000, () => {
  const host = 'localhost'
  const { port } = server.address()
  console.log(`listening on http://${host}:${port}/`)
})

