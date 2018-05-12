# MRP by Deksden

Simple MRP2 / ARP solution (resource planning for production). USed for in-house planning by me.

Usage:

* define some JSON documents to describe your factory, manufacturing process, resources used and final products
* **products.jsons** file used for product description
* **resources.json** used for resources (something that was consumpted during manufacturing process of product) description
* **process.json** file is used to describe manufacturing process.

Use npm scripts:
* **dev** - some ERP calculation with visualization via terminal output
* **test** - some test for ERP calculations (mocha)
* **server** - start simple server with some UI/visualization of data

## Products

Describe all your products inside any JSON file with structure similar to **products.json**. Only file structure is essential, not file name - you can use any file name (in test suites/cases file names are different).

Product structure^ file is JSON array with JSON objects. Object's properties are:

* _productId:_ string - any unique identifier, 
* _name:_ string - some description of product, did not used in any calculations,
* _unit:_ string - unit for product quantities, did not used in calculations, only for reference / output formatting
* _startQnt:_: object - starting quantity for some date:
  * _date:_ starting date in DD-MM-YYYY format
  * _qnt:_ starting qnt
  
## Resources

Structure of _resources.json_ - resource for manufacturing of product.
  
## Process

Structure of _process.json_ - manufacturing process description

## Manufacturing

Structure of _manufacturing.json_ - manufacturing plan definition



