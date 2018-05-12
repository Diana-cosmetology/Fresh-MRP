
export default module.exports = (app) => {
  return {
    getProducts: (req, res) => {
      const products = app.data.products

      res.render('products', { "products": products })
      return {}
    }
  }
}