/* eslint-disable array-callback-return,no-param-reassign */
import _ from 'lodash'
import moment from 'moment-business-days'
import fs from 'fs'

const DATE_PATTERN = 'DD-MM-YYYY'

export class Manufacturing {
  constructor() {
    this.manufacturing = []
    this.process = []
    this.resources = null
  }

  loadFromFile(filename) {
    const loaded = JSON.parse(fs.readFileSync(filename, 'utf8'))
    this.manufacturing = []
    loaded.map((item) => {
      this.manufacturing.push(item)
    })
  }

  processManufacturing() {
    // iterate over manufacturing plan
    this.manufacturing.map((item) => {
      item.process = _.find(this.process, ['processId', item.processId])
      item.readyDate = moment(item.date, DATE_PATTERN)
      item.resourcesUsed = []

      // if process is not defined or not found for this plan item
      if (!item.process || !this.resources) { return }

      let aDate = item.readyDate
      let totalDuration = 0
      item.process.stages.map((stage) => {
        aDate = aDate.businessSubtract(stage.duration)
        totalDuration += stage.duration

        // calculate resource usage:
        if (!stage.resources) { return }

        for (const stageResource of stage.resources) {
          stageResource.resource = this.resources.byId(stageResource.resourceId)
          // calc resource usage for this step
          const reqQnt = (item.qnt * stageResource.qnt) / stageResource.qntBase

          // calc actual resource count
          let factQnt = stageResource.resource.forDate(aDate)

          // if there is enough resources for this stage of manufacturing:
          if (factQnt < reqQnt - stageResource.resource.minStock) {
            // not enough resources, register resource order for needed resource
            stageResource.resource.addOrder(aDate, reqQnt)
            factQnt = stageResource.resource.forDate(aDate)
          }

          // simply register resource's consumption:
          stageResource.resource.addOpToRegistry({
            opId: stageResource.resource.registry.length + 1,
            date: aDate,
            opType: '2-dec',
            qnt: Math.round(reqQnt),
          })

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

}