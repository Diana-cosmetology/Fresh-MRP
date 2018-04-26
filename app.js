/*

Регистр остатков ресурсов: по партиям:

- каждое поступление добавляет к остаткам товара сведения, в результате на каждую дату поступления пересчитываются
остатки

res reg:
  - resourceId
    - opType: initial, inc, dec
    - date
    - qnt
    - price
    - value
    - remains:
      - qnt
      - price
      - value


*/
const util = require('util')
const _ = require('lodash')
const moment = require('moment-business-days')

const process = require("./data/process")
const products = require("./data/products")
const resources = require("./data/resources")

/* Process resource registry to calculate remains up to date and remains quantity:
* */
function processRemains(registry) {
  let qnt = 0
  let value = 0
  let remains = []

  for (let item of registry) {
    if (item.opType === "initial") {
      qnt = item.qnt
      value = item.value
      remains = []
      remains.push({
        "opId": item.opId,
        "date": moment(item.date, 'DD-MM-YYYY'),
        "qnt": item.qnt,
        "price": item.price,
        "value": item.value
      })
    }

    if(item.opType === "inc") {
      qnt += item.qnt
      value += item.value
      remains.push({
        "opId": item.opId,
        "date": moment(item.date, 'DD-MM-YYYY'),
        "qnt": item.qnt,
        "price": item.price,
        "value": item.value
      })
    }

    // decrement operation have no value & price, so we nned to calculate it
    if(item.opType === "dec") {
      qnt -= item.qnt

      // if qnt < 0 then raise exception

      let remainQnt = item.qnt // process whole remain qnt
      let ndx = 0
      const maxNdx = remains.length
      while (remainQnt > 0 && ndx < maxNdx) {
        if ((remains[ndx].qnt - remainQnt) < 0) { // remains qnt is less then decrement operation's qnt
          remainQnt -= remains[ndx].qnt
          remains[ndx].qnt = 0 // mark to remove this entry from remains array
          value -= remains[ndx].value
        } else {
          remains[ndx].qnt -= remainQnt
          remains[ndx].value = Math.round(remains[ndx].qnt * remains[ndx].price)
          value -= Math.round(remainQnt * remains[ndx].price)
          remainQnt = 0
        }
        ndx++
      }

      // remove all zeroed remains from array:
      while (remains[0].qnt === 0 && remains.length > 0) {
        remains.splice(0, 1)
      }
    }

    item.remainQnt = qnt
    item.remainValue = value
    item.remains = _.cloneDeep(remains)
  }
}

const resReg = [] // registry for resources

for (let resource of resources) {
  console.log(util.inspect(resource, false, null))

  const res = {
    "resourceId": resource.resourceId,
    "registry": []
  }
  let opId = 1

  if (resource.startQnt) {
    res.registry.push({
      "opId": opId++,
      "opType": "initial",
      "date": moment(resource.startQnt.date, 'DD-MM-YYYY'),
      "qnt": resource.startQnt.qnt,
      "price": resource.startQnt.price,
      "value": Math.round(resource.startQnt.qnt * resource.startQnt.price)
    })
  }

  if (resource.inTransfer) {
    for (let transfer of resource.inTransfer) {
      res.registry.push({
        "opId": opId++,
        "opType": "inc",
        "date": moment(transfer.dateArrival, 'DD-MM-YYYY'),
        "qnt": transfer.qnt,
        "price": transfer.price,
        "value": Math.round(transfer.qnt * transfer.price)
      })
    }
  }
  resReg.push(res)
}

// add test operation for decrement of qnt:
resReg[0].registry.push({
  "opId": 3,
  "opType": "dec",
  "date": moment("01-03-2018", 'DD-MM-YYYY'),
  "qnt": 420
})

// process remains for each resource's registry:
for (let res of resReg) {
  if(res.registry) processRemains(res.registry)
}

console.log('## Resource registry (with remains):')
console.log(util.inspect(resReg, false, null))

