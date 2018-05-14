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
    },
  }
}
