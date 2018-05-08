/**
 (c) deksden, 2017-2018
 */

/* eslint-disable no-restricted-syntax, no-param-reassign, no-use-before-define,
array-callback-return, no-console, no-plusplus */
import chai from "chai"

import process from '../data/process.json'
import process2 from './data/proc-2.json'

import { Resources } from '../source/resource'
import { Manufacturing } from '../source/manufacturing'

const expect = chai.expect


describe('MRP test cases', () => {
  const resources = new Resources()
  const manufacturing = new Manufacturing()

  /**
   * Somple case: initial qnt is 120, in transit was 300, production consumption is 155.
   */
  describe('mfg-1: simple production', () => {
    before(function (done) {
      this.timeout(10000)
      resources.loadFromFile('./test/data/res-1.json')
      manufacturing.loadFromFile('./test/data/mfg-1.json')
      manufacturing.resources = resources
      manufacturing.process = process

      done()
    })

    it('Should pass all checks', function (done) {
      this.timeout(5000)
      manufacturing.processManufacturing()

      const hy_resource = resources.byId('hy')
      expect(hy_resource).to.exist
      expect(hy_resource.registry).to.exist
      expect(hy_resource.registry).to.have.lengthOf(3)

      expect(hy_resource.registry[0].remainQnt).to.be.equal(120)
      expect(hy_resource.registry[1].remainQnt).to.be.equal(120+300)
      expect(hy_resource.registry[2].remainQnt).to.be.equal(120+300-160)

      expect(hy_resource.registry[0].remains).to.have.lengthOf(1)
      expect(hy_resource.registry[1].remains).to.have.lengthOf(2)
      expect(hy_resource.registry[2].remains).to.have.lengthOf(1)
      done()
    })
  })

  /**
   * More advanced production case:
   * - initial 120
   * - inTransit 300
   * - minOrder 300
   * - minStock 30
   * - prod: (mfg-2.json)
   *    04: 10000 (-160)
   *    05: 15000 (-240) (less then minStock)
   */
  describe('mfg-2: more advanced sample with 1 order', () => {
    before(function (done) {
      this.timeout(10000)
      resources.loadFromFile('./test/data/res-1.json')
      manufacturing.loadFromFile('./test/data/mfg-2.json')
      manufacturing.resources = resources
      manufacturing.process = process

      done()
    })

    it('Should pass all checks', function (done) {
      this.timeout(5000)
      manufacturing.processManufacturing()

      const hy_resource = resources.byId('hy')
      expect(hy_resource).to.exist
      expect(hy_resource.registry).to.exist
      expect(hy_resource.registry).to.have.lengthOf(6)

      expect(hy_resource.registry[0].remainQnt).to.be.equal(120)
      expect(hy_resource.registry[1].remainQnt).to.be.equal(120+300)
      expect(hy_resource.registry[2].remainQnt).to.be.equal(120+300-160)
      expect(hy_resource.registry[3].remainQnt).to.be.equal(120+300-160-240)
      expect(hy_resource.registry[4].remainQnt).to.be.equal(120+300-160-240+300)
      expect(hy_resource.registry[5].remainQnt).to.be.equal(120+300-160-240+300-80)

      expect(hy_resource.registry[0].remains).to.have.lengthOf(1)
      expect(hy_resource.registry[1].remains).to.have.lengthOf(2)
      expect(hy_resource.registry[2].remains).to.have.lengthOf(1)
      expect(hy_resource.registry[3].remains).to.have.lengthOf(1)
      expect(hy_resource.registry[4].remains).to.have.lengthOf(2)
      expect(hy_resource.registry[5].remains).to.have.lengthOf(1)
      done()
    })
  })

  /**
   * BIOMATRIX Serum test case: produce 2000 units:
   */
  describe('mfg-3: basic serum production', () => {
    before(function (done) {
      this.timeout(10000)
      resources.loadFromFile('./test/data/res-1.json')
      resources.addFromFile('./test/data/res-2.json')
      manufacturing.loadFromFile('./test/data/mfg-3.json')
      manufacturing.resources = resources
      manufacturing.process = process2

      done()
    })

    it('Should pass all checks', function (done) {
      this.timeout(5000)
      manufacturing.processManufacturing()

      const hy_resource = resources.byId('hy-ch')
      expect(hy_resource).to.exist
      expect(hy_resource.registry).to.exist
      expect(hy_resource.registry).to.have.lengthOf(3)

      expect(hy_resource.registry[0].remainQnt).to.be.equal(120)
      expect(hy_resource.registry[1].remainQnt).to.be.equal(120 + 300)
      expect(hy_resource.registry[2].remainQnt).to.be.equal(120 + 300 - 160)

      expect(hy_resource.registry[0].remains).to.have.lengthOf(1)
      expect(hy_resource.registry[1].remains).to.have.lengthOf(2)
      expect(hy_resource.registry[2].remains).to.have.lengthOf(1)
      done()
    })
  })

})