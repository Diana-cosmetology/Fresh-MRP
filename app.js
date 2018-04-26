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

const DATE_PATTERN = 'DD-MM-YYYY'
const resReg = [] // registry for resources

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
      while (remains[0].qnt === 0 && remains.length > 0) {
        remains.splice(0, 1)
      }
    }

    item.remainQnt = qnt
    item.remainValue = value
    item.remains = _.cloneDeep(remains)
  }
}

function resQntForDate(resource, date) {
  // get registry for resource
  const res = _.find(resReg, ['resourceId', resource.resourceId])

  // process registry to get all information:
  let qnt = 0

  if (res && res.registry) {
    for (let item of res.registry) {
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
  resource.registry = _.sortBy(resource.registry, ['date', 'opType'])
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
      aDate = aDate.businessSubtract(stage.duration)
      totalDuration += stage.duration

      // calc resources
      if (!stage.resources)
        continue

      // calculate resource usage:
      for(let stageResource of stage.resources) {
        stageResource.resource = _.find(resources, ['resourceId', stageResource.resourceId])
        // calc resource usage for this step
        let reqQnt = stageResource.qnt / stageResource.qntBase * item.qnt

        // calc actual resource count
        let factQnt = resQntForDate(stageResource, aDate)

        // if there is ok with resources:
        if (factQnt >= reqQnt - stageResource.resource.minQnt) {
          // add registry item about utilizing that resources:
          addRegistryOp(_.find(resReg, ['resourceId', stageResource.resourceId]), {
            "opId": resReg.length + 1,
            "date": aDate,
            "opType": "dec",
            "qnt": Math.round(reqQnt),
          })
        }

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
      "date": moment(resource.startQnt.date, DATE_PATTERN),
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
        "date": moment(transfer.dateArrival, DATE_PATTERN),
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
  "date": moment("01-03-2018", DATE_PATTERN),
  "qnt": 420
})

// process remains for each resource's registry:
for (let res of resReg) {
  if(res.registry) processRemains(res.registry)
}

console.log('## Resource registry (with remains):')
console.log(util.inspect(resReg, false, null))

processManufacturing()

console.log(util.inspect(manufacturing, false, null))
