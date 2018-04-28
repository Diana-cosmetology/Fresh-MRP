/* eslint-disable no-restricted-syntax, no-param-reassign, no-use-before-define,
array-callback-return, no-console, no-plusplus */
import chai from "chai"

import process from '../data/process.json'

import { Resources } from '../source/resource'
import { Manufacturing } from '../source/manufacturing'

const expect = chai.expect


describe('ERP use cases', () => {
  const resources = new Resources()
  const manufacturing = new Manufacturing()

  before(function (done) {
    this.timeout(10000)
    resources.loadFromFile('./data/resources-1.json')
    manufacturing.loadFromFile('./data/manufacturing-1.json')
    manufacturing.resources = resources
    manufacturing.process = process

    done()
  })

  it('Simple production schedule', function (done) {
    this.timeout(5000)
    manufacturing.processManufacturing()

    const hy_resource = resources.byId('hy')
    expect(hy_resource).to.exist
    expect(hy_resource.registry).to.exist
    done()
  })
})