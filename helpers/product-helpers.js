
const db = require('../config/connection')
var collection = require('../config/collections')
const { ObjectId } = require('mongodb');
const { response } = require('express');
const bcrypt = require('bcrypt')






module.exports = {
    
  doLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
        let loginStatus = false
        let response = {}
        let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email })
        if (admin) {
            bcrypt.compare(adminData.Password, admin.Password).then((status) => {
                if (status) {
                    console.log("login success");
                    response.admin = admin
                    response.status = true
                    resolve(response)
                } else {
                    console.log("Login failed");
                    resolve({ status: false })
                }

            })
        } else {
            console.log('login failed');
            resolve({ status: false })

        }
    })
},
  addProduct: (product, callback) => {

    db.get().collection('product').insertOne(product).then((data) => {

      callback(data.insertedId)
    })
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
      resolve(products)
    })
  },
  deleteProduct: (prodId) => {

    return new Promise((resolve, reject) => {


      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(prodId) }).then((response) => {
        resolve(response)
      })

    })
  },
  getProductDetails: (proId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((response) => {
        resolve(response);
      })
    })
  },
  updateProduct:(proId,proDetails)=>{
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: new ObjectId(proId) },{
        $set:{
          Name:proDetails.Name,
          Description:proDetails.Description,
          Price:proDetails.Price,
          Category:proDetails.Category

        }
      }).then((response)=>{
        resolve(response)
      })
  })
}
}
