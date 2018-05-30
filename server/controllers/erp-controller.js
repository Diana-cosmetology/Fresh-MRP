/* eslint-disable arrow-body-style */
import _ from 'lodash'

export default module.exports = (app) => {
  return {
    getProducts: (req, res) => {
      const { products } = app.data

      res.render('products', { products })
      return {}
    },
    getProduct: (req, res) => {
      const { productId } = req.params

      res.render('product', { productId, product: _.find(app.data.products, { productId }) })
      return {}
    },
    getResources: (req, res) => {
      const { resources } = app.data

      res.render('resources', { resources })
      return {}
    },
    getResource: (req, res) => {
      const { resourceId } = req.params

      res.render('resource', { resourceId, resource: app.data.res.byId(resourceId) })
      return {}
    },
    getManufacturing: (req, res) => {
      const { manufacturing } = app.data.manufacturing

      res.render('manufacturing', { manufacturing })
      return {}
    },
    getOrders: (req, res) => {
      const orders = app.data.manufacturing.resources.getOrders()

      res.render('orders', { orders })
      return {}
    },
    getProcesses: (req, res) => {
      const processes = app.data.process

      res.render('processes', { processes })
      return {}
    },
    getProcess: (req, res) => {
      const process = _.find(app.data.process, { processId: req.params.processId } )

      res.render('process', { process })
      return {}
    },
    getConfig: (req, res) => {
      const { config } = app.data

      res.render('config', { config })
      return {}
    },
    setConfig: (req, res) => {
      const configNdx = req.params.id

      if (configNdx < 0 || configNdx >= app.data.config.preset.length) return {}

      // switch config:
      app.data.res.loadFromFile(`${app.data.config.preset[configNdx].resourcesFile}`)
      app.data.resource = app.data.res.resources
      app.data.manufacturing.loadFromFile(`${app.data.config.preset[configNdx].manufacturingFile}`)
      app.data.manufacturing.resources = app.data.res
      app.data.manufacturing.process = app.data.process
      app.data.manufacturing.processManufacturing()

      app.data.config.resourcesFile = app.data.config.preset[configNdx].resourcesFile
      app.data.config.manufacturingFile = app.data.config.preset[configNdx].manufacturingFile

      const { config } = app.data

      res.render('config', { config })
      return {}
    },
  }
}
