/*

Регистр остатков ресурсов: по партиям:

- каждое поступление добавляет к остаткам товара сведения, в результате на каждую дату поступления пересчитываются
остатки


*/
const util = require('util')

const process = require("./data/process")
const products = require("./data/products")
const resources = require("./data/resources")

// calculate

var resReg = [] // колчиество ресурсов на указанную дату

console.log('Resources:')
console.log(util.inspect(resources, false, null))

for (let resource of resources) {
  console.log(util.inspect(resource, false, null))

  const res = {
    "resourceId": resource.resourceId,
    "qnt": []
  }

  if (resource.startQnt) {
    res.qnt.push({
      "date": resource.startQnt.date,
      "qnt": resource.startQnt.qnt,
      "price": resource.startQnt.price
    })
  }

  if (resource.inTransfer) {
    for (let transfer of resource.inTransfer) {
      res.qnt.push({
        "date": transfer.dateArrival,
        "qnt": transfer.qnt,
        "price": transfer.price
      })
    }
  }
  resReg.push(res)
}

console.log('reqQntPyPeriod')
console.log(util.inspect(resReg, false, null))
