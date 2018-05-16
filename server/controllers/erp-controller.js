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
    getProcess: (req, res) => {
      const { process } = app.data

      res.render('process', { process })
      return {}
    },
    getManufacturing: (req, res) => {
      const { manufacturing } = app.data

      res.render('manufacturing', { manufacturing })
      return {}
    },
  }
}
