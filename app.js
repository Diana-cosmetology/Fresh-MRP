/* eslint-disable no-restricted-syntax, no-param-reassign, no-use-before-define,
array-callback-return, no-console, no-plusplus */
import util from 'util'
import _ from 'lodash'
import moment from 'moment-business-days'

import process from './data/process.json'
// const products = require("./data/products")
import resources from './data/resources.json'
import manufacturing from './data/manufacturing.json'

const DATE_PATTERN = 'DD-MM-YYYY'

/**
 * initResources:: initialize loaded resources.json with processed initialQnt and inTransferQnt
 */
function initResources() {
  for (const resource of resources) {
    resource.registry = []
    let opId = 1

    if (resource.initialQnt) {
      resource.registry.push({
        opId: opId++,
        opType: 'initial',
        date: moment(resource.initialQnt.date, DATE_PATTERN),
        qnt: resource.initialQnt.qnt,
        price: resource.initialQnt.price,
        value: Math.round(resource.initialQnt.qnt * resource.initialQnt.price),
      })
    }

    if (resource.inTransfer) {
      for (const transfer of resource.inTransfer) {
        resource.registry.push({
          opId: opId++,
          opType: 'inc',
          opSubType: 'inTransfer',
          date: moment(transfer.dateArrival, DATE_PATTERN),
          qnt: transfer.qnt,
          price: transfer.price,
          value: Math.round(transfer.qnt * transfer.price),
        })
      }
    }
    processRemains(resource)
  }
}

function sortRegistry(resource) {
  if (resource.registry) { resource.registry = _.sortBy(resource.registry, ['date', 'opType', 'subOpType']) }
}

/* Process resource registry to calculate remains up to date and remains quantity:
* */
function processRemains(resource) {
  let qnt = 0
  let value = 0
  let remains = []

  sortRegistry(resource)

  if (!resource.registry) {
    resource.registry = []
    return
  }

  for (const item of resource.registry) {
    if (item.opType === 'initial') {
      ({ qnt, value } = item)
      remains = []
      remains.push({
        opId: item.opId,
        date: moment(item.date, DATE_PATTERN),
        qnt: item.qnt,
        price: item.price,
        value: item.value,
      })
    }

    if (item.opType === 'inc') {
      qnt += item.qnt
      value += item.value
      remains.push({
        opId: item.opId,
        date: moment(item.date, DATE_PATTERN),
        qnt: item.qnt,
        price: item.price,
        value: item.value,
      })
    }

    // decrement operation have no value & price, so we nned to calculate it
    if (item.opType === 'dec') {
      qnt -= item.qnt

      // if qnt < 0 then raise exception

      let remainQnt = item.qnt // process whole remain qnt
      let ndx = 0
      const maxNdx = remains.length
      while (remainQnt > 0 && ndx < maxNdx) {
        if ((remains[ndx].qnt - remainQnt) < 0) { // remains qnt is less then operation's qnt
          remainQnt -= remains[ndx].qnt
          remains[ndx].qnt = 0 // mark to remove this entry from remains array
          value -= remains[ndx].value
        } else {
          remains[ndx].qnt -= remainQnt
          remains[ndx].value = Math.round(remains[ndx].qnt * remains[ndx].price)
          value -= Math.round(remainQnt * remains[ndx].price)
          remainQnt = 0
        }
        ndx += 1
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
    for (const item of resource.registry) {
      if (item.date.isSameOrBefore(date)) {
        qnt = item.remainQnt
      } else { break }
    }
  }
  return qnt
}

function addOpToRegistry(resource, op) {
  resource.registry.push(op)
  sortRegistry(resource)
}

function getLastOrder(date, resource) {
  let lastOrder

  if (!resource.orders) {
    resource.orders = []
  }

  for (const order of resource.orders) {
    if (order.date.businessDiff(date) < resource.orderPeriod) {
      lastOrder = order
    }
  }

  return lastOrder
}

function addOrder(date, resource, reqQnt) {
  // check if we have some order for resource already in order window period:
  const lastOrder = getLastOrder(date, resource)

  if (lastOrder) {
    // ok, increase order by reqQnt:
    lastOrder.reqQnt += reqQnt
    lastOrder.qnt = lastOrder.reqQnt < resource.minQnt ? resource.minQnt : lastOrder.reqQnt
  } else {
    // register new order for this resource
    resource.orders.push({
      resource,
      date,
      reqQnt,
      qnt: reqQnt < resource.minQnt ? resource.minQnt : reqQnt,
    })
  }

  addOrdersToRegistry(resource)
}

function addOrdersToRegistry(resource) {
  // remove all orders from registry, then add them with new data
  _.remove(resource.registry, ['opSubType', 'order'])

  for (const order of resource.orders) {
    resource.registry.push({
      id: resource.registry.length + 1,
      opType: 'inc',
      opSubType: 'order',
      qnt: order.qnt,
      date: order.date,
      price: order.resource.defPrice,
      value: Math.round(order.qnt * order.resource.defPrice),
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
  manufacturing.map((item) => {
    item.process = _.find(process, ['processId', item.processId])
    item.readyDate = moment(item.date, DATE_PATTERN)
    item.resourcesUsed = []

    // if process is not defined or not found for this plan item
    if (!item.process) { return }

    let aDate = item.readyDate
    let totalDuration = 0
    item.process.stages.map((stage) => {
      aDate = aDate.businessSubtract(stage.duration)
      totalDuration += stage.duration

      // calculate resource usage:
      if (!stage.resources) { return }

      for (const stageResource of stage.resources) {
        stageResource.resource = findResourceById(stageResource.resourceId)
        // calc resource usage for this step
        const reqQnt = (item.qnt * stageResource.qnt) / stageResource.qntBase

        // calc actual resource count
        let factQnt = resQntForDate(stageResource.resource, aDate)

        // if there is enough resources for this stage of manufacturing:
        if (factQnt < reqQnt - stageResource.resource.minStock) {
          // not enough resources, register resource order for needed resource
          addOrder(aDate, stageResource.resource, reqQnt)
          factQnt = resQntForDate(stageResource, aDate)
        }

        // simply register resource's consumption:
        addOpToRegistry(stageResource.resource, {
          opId: stageResource.resource.registry.length + 1,
          date: aDate,
          opType: 'dec',
          qnt: Math.round(reqQnt),
        })
        processRemains(stageResource.resource)

        // push data for later usage
        item.resourcesUsed.push({
          stage,
          stageResource,
          reqQnt: Math.round(reqQnt),
          factQnt,
        })
      }
    })
    item.startDate = aDate
    item.totalDuration = totalDuration
  })
}

initResources()

console.log('## Resource registry (with remains):')
console.log(util.inspect(resources, false, null))

processManufacturing()

console.log('## Manufacturing: ')
console.log(manufacturing)

console.log('## Resource registry (with remains - after manufacturing):')
console.log(util.inspect(resources, false, null))
