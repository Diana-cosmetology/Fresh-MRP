/* eslint-disable no-underscore-dangle,array-callback-return,no-plusplus,no-param-reassign */
import moment from 'moment-business-days'
import _ from 'lodash'
import fs from 'fs'

const DATE_PATTERN = 'DD-MM-YYYY'

/**
 Resource class
 */
export class Resource {
  initFromObject(aObject) {
    _.assign(this, aObject)
    this.init()
  }

  init() {
    const resource = this

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
      resource.inTransfer.map((transfer) => {
        resource.registry.push({
          opId: opId++,
          opType: 'inc',
          opSubType: 'inTransfer',
          date: moment(transfer.dateArrival, DATE_PATTERN),
          qnt: transfer.qnt,
          price: transfer.price,
          value: Math.round(transfer.qnt * transfer.price),
        })
      })
    }
    this.processRemains()
  }

  sortRegistry() {
    const resource = this
    if (resource.registry) { resource.registry = _.sortBy(resource.registry, ['date', 'opType', 'subOpType']) }
  }

  processRemains() {
    const resource = this
    let qnt = 0
    let value = 0
    let remains = []

    this.sortRegistry(resource)

    if (!resource.registry) {
      resource.registry = []
      return
    }

    resource.registry.map((item) => {
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
    })
  }

  forDate(date) {
    const resource = this
    // process registry to get all information:
    let qnt = 0

    if (!resource.registry) return 0

    resource.registry.map((item) => {
      if (item.date.isSameOrBefore(date)) {
        qnt = item.remainQnt
      }
    })
    return qnt
  }

  addOpToRegistry(op) {
    this.registry.push(op)
    this.sortRegistry()
    this.processRemains()
  }

  getLastOrder(date) {
    const resource = this
    let lastOrder

    if (!resource.orders) {
      resource.orders = []
    }

    resource.orders.map((order) => {
      if (order.date.businessDiff(date) < resource.orderPeriod) {
        lastOrder = order
      }
    })

    return lastOrder
  }

  addOrder(date, reqQnt) {
    const resource = this
    // check if we have some order for resource already in order window period:
    const lastOrder = this.getLastOrder(date)

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

    this.processOrders()
  }

  processOrders() {
    const resource = this

    // remove all orders from registry, then add them with new data
    _.remove(resource.registry, ['opSubType', 'order'])

    resource.orders.map((order) => {
      this.addOpToRegistry({
        id: resource.registry.length + 1,
        opType: 'inc',
        opSubType: 'order',
        qnt: order.qnt,
        date: order.date,
        price: order.resource.defPrice,
        value: Math.round(order.qnt * order.resource.defPrice),
      })
    })
  }
}

/**
 * Resources class (list of Resource)
 */
export class Resources {
  constructor() {
    this.resources = []
  }

  loadFromFile(filename) {
    const loadedResources = JSON.parse(fs.readFileSync(filename, 'utf8'));

    loadedResources.map((loadedResource) => {
      const aResource = new Resource()
      aResource.initFromObject(loadedResource)
      this.resources.push(aResource)
    })
  }

  byId(resId) {
    return _.find(this.resources, ['resourceId', resId])
  }
}

