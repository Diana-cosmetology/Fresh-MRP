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
const manufacturing = require("./data/manufacturing")
const resourceOrders = []

const DATE_PATTERN = 'DD-MM-YYYY'

/**

 Resource Operation:
   (props)
   (remain + remains)

 Resource Remain:
   - qnt
   - value
   - price

 Resource:
  (props)
  Operations: [] ResourceOperation

 Orders:
   (props)
   MakeOrder


*/

/**
 * initResources:: initialize loaded resources.json with processed initialQnt and inTransferQnt
 */
function initResources() {
  for(let resource of resources) {
    resource.registry = []
    let opId = 1

    if (resource.initialQnt) {
      resource.registry.push({
        "opId": opId++,
        "opType": "initial",
        "date": moment(resource.initialQnt.date, DATE_PATTERN),
        "qnt": resource.initialQnt.qnt,
        "price": resource.initialQnt.price,
        "value": Math.round(resource.initialQnt.qnt * resource.initialQnt.price)
      })
    }

    if (resource.inTransfer) {
      for (let transfer of resource.inTransfer) {
        resource.registry.push({
          "opId": opId++,
          "opType": "inc",
          "opSubType": "inTransfer",
          "date": moment(transfer.dateArrival, DATE_PATTERN),
          "qnt": transfer.qnt,
          "price": transfer.price,
          "value": Math.round(transfer.qnt * transfer.price)
        })
      }
    }
    processRemains(resource)
  }
}

function sortRegistryForResource(resource) {
  if (resource.registry)
    resource.registry = _.sortBy(resource.registry, ['date', 'opType', 'subOpType'])
}

/* Process resource registry to calculate remains up to date and remains quantity:
* */
function processRemains(resource) {
  let qnt = 0
  let value = 0
  let remains = []

  sortRegistryForResource(resource)

  if (!resource.registry) {
    resource.registry = []
    return
  }

  for (let item of resource.registry) {
    if (item.opType === "initial") {
      qnt = item.qnt
      value = item.value
      remains = []
      remains.push({
        "opId": item.opId,
        "date": moment(item.date, DATE_PATTERN),
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
        "date": moment(item.date, DATE_PATTERN),
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
      if (remains) {
        while (remains.length > 0 && remains[0].qnt === 0) {
          remains.splice(0, 1)
        }
      }
    }

    item.remainQnt = qnt
    item.remainValue = value
    item.remains = _.cloneDeep(remains)
  }
}


function findResourceById(resId) {
  return _.find(resources, ['resourceId', resId])
}

function resQntForDate(resource, date) {
  // process registry to get all information:
  let qnt = 0

  if (resource.registry) {
    for (let item of resource.registry) {
      if (item.date.isSameOrBefore(date)) {
        qnt = item.remainQnt
      } else
        break
    }
  }
  return qnt
}

function addRegistryOp(resource, op) {
  resource.registry.push(op)
  sortRegistryForResource(resource)
}

function getLastOrderForResource(date, resource) {
  let lastOrder = undefined

  for (let order of resourceOrders) {
    if ((order.resource.resourceId === resource.resourceId) && (order.date.businessDiff(date) < resource.orderPeriod))
      lastOrder = order
  }

  return lastOrder
}

function addResourceOrder(date, resource, reqQnt) {
  // check if we have some order for resource already in order window period:
  let lastOrder = getLastOrderForResource(date,resource)

  if (lastOrder) {
    // ok, increase order by reqQnt:
    lastOrder.reqQnt += reqQnt
    lastOrder.qnt = lastOrder.reqQnt < resource.minQnt ? resource.minQnt : lastOrder.reqQnt // handle min batch for order
  } else {
    // register new order for this resource
    resourceOrders.push({
      "resource": resource,
      "date": date,
      "reqQnt": reqQnt,
      "qnt": reqQnt < resource.minQnt ? resource.minQnt : reqQnt
    })
  }

  addOrdersToRegistry(resource)
}

function addOrdersToRegistry(resource) {
  // remove all orders from registry, then add them with new data
  _.remove(resource.registry, ['opSubType', 'order'])

  for(let order of resourceOrders) {
    if (order.resource.resourceId === resource.resourceId)
      resource.registry.push({
        "id": resource.registry.length + 1,
        "opType": "inc",
        "opSubType": "order",
        "qnt": order.qnt,
        "date": order.date,
        "price": order.resource.defPrice,
        "value": Math.round(order.qnt * order.resource.defPrice)
      })
  }

  // process remains:
  processRemains(resource)
}

/*
  Process Manufacturing plan:
  - from first to last
*/
function processManufacturing() {
  // iterate over manufacturing plan
  for(let item of manufacturing) {
    item.process = _.find(process, ['processId', item.processId])
    item.readyDate = moment(item.date, DATE_PATTERN)
    item.resourcesUsed = []

    // if process is not defined or not found for this plan item
    if (!item.process)
      continue

    let aDate = item.readyDate
    let totalDuration = 0
    for(let stage of item.process.stages) {
      console.log('stage:')
      console.log(stage)

      aDate = aDate.businessSubtract(stage.duration)
      totalDuration += stage.duration

      // calculate resource usage:
      if (!stage.resources)
        continue

      for(let stageResource of stage.resources) {
        stageResource.resource = findResourceById(stageResource.resourceId)
        // calc resource usage for this step
        let reqQnt = stageResource.qnt / stageResource.qntBase * item.qnt

        // calc actual resource count
        let factQnt = resQntForDate(stageResource, aDate)

        // if there is enough resources for this stage of manufacturing:
        if (factQnt < reqQnt - stageResource.resource.minStock) {
          // not enough resources, register resource order for needed resource
          addResourceOrder(aDate, stageResource.resource, reqQnt)
          factQnt = resQntForDate(stageResource, aDate)
        }

        // simply register resource's consumption:
        addRegistryOp(stageResource.resource, {
          "opId": stageResource.resource.registry.length + 1,
          "date": aDate,
          "opType": "dec",
          "qnt": Math.round(reqQnt),
        })
        processRemains(stageResource.resource)

        // push data for later usage
        item.resourcesUsed.push({
          "stage": stage,
          "stageResource": stageResource,
          "reqQnt": Math.round(reqQnt),
          "factQnt": factQnt
        })
      }
    }
    item.startDate = aDate
    item.totalDuration = totalDuration
  }
}

initResources()

console.log('## Resource registry (with remains):')
console.log(util.inspect(resources, false, null))

processManufacturing()

console.log('## Manufacturing: ')
console.log(manufacturing)

console.log('## resourceOrders: ')
console.log(util.inspect(resourceOrders, false, null))

console.log('## Resource registry (with remains - after manufacturing):')
console.log(util.inspect(resources, false, null))
