/**
 (c) deksden, 2017-2018
 */
/* eslint-disable no-restricted-syntax, no-param-reassign, no-use-before-define,
array-callback-return, no-console, no-plusplus */
import util from 'util'

import process from './data/process.json'

import { Resources } from './source/resource'
import { Manufacturing } from './source/manufacturing'

const resources = new Resources()
const manufacturing = new Manufacturing()

resources.loadFromFile('./data/resources.json')
manufacturing.loadFromFile('./data/manufacturing.json')
manufacturing.resources = resources
manufacturing.process = process

console.log('## Resource registry (with remains):')
console.log(util.inspect(resources, false, null))

manufacturing.processManufacturing()

console.log('## Manufacturing: ')
console.log(manufacturing)

console.log('## Resource registry (with remains - after manufacturing):')
console.log(util.inspect(resources, false, null))
