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
    resources.loadFromFile('./test/data/resources-1.json')
    manufacturing.loadFromFile('./test/data/manufacturing-1.json')
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
    expect(hy_resource.registry).to.have.lengthOf(3)

    expect(hy_resource.registry[0].remainQnt).to.be.equal(120)
    expect(hy_resource.registry[1].remainQnt).to.be.equal(120+300)
    expect(hy_resource.registry[2].remainQnt).to.be.equal(120+300-155)

    expect(hy_resource.registry[0].remains).to.have.lengthOf(1)
    expect(hy_resource.registry[1].remains).to.have.lengthOf(2)
    expect(hy_resource.registry[2].remains).to.have.lengthOf(1)
    done()
  })
})