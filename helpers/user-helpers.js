
const db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')
const { response } = require('express')
const Razorpay = require('razorpay');
const { resolve } = require('path')
const { log } = require('console')


var instance = new Razorpay
    ({
        key_id: 'rzp_test_7XhTSj7dpY5Wn1',
        key_secret: 'R7dzZ0XLUr4jPFenOXq1Js8s'
    })

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("login success");
                        response.user = user
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
    addToCart: (proId, userId) => {
        let proObj = {
            item: new ObjectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (userCart) {
                let proExits = userCart.products.findIndex(product => product.item == proId)
                if (proExits != -1) {

                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
                        {

                            $inc: { 'products.$.quantity': 1 }

                        }
                    ).then(() => {
                        resolve()

                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId) },
                        {
                            $push: { products: proObj }
                        }
                    ).then((response) => {
                        resolve()
                    })

                }

            } else {
                let cartObj = {
                    user: new ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }

        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            resolve(cartItems)
        })
    },


    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (detailes) => {

        detailes.count = parseInt(detailes.count)
        detailes.quantity = parseInt(detailes.quantity)
        return new Promise(async (resolve, reject) => {
            if (detailes.count == -1 && detailes.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(detailes.cart) },
                    {

                        $pull: { products: { item: new ObjectId(detailes.product) } }

                    }
                ).then((response) => {
                    resolve({ removeProduct: true })

                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(detailes.cart), 'products.item': new ObjectId(detailes.product) },
                    {

                        $inc: { 'products.$.quantity': detailes.count }

                    }
                ).then((response) => {
                    resolve({ status: true })

                })
            }

        })
    },
    RemoveProduct: (detailes) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(detailes.cart) },
                {

                    $pull: { products: { item: new ObjectId(detailes.product) } }

                }
            )


        })

    },
    getTotalAmount: (userId) => {

        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }

                    }
                }

            ]).toArray()
            resolve(total[0].total)
        })

    },
    placeOrder: (order, products, total) => {
        return new Promise(async (resolve, reject) => {

            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: new ObjectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()

            }
            db.get().collection(collection.ORDER_COLLECTON).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(order.userId) })
                resolve(response.insertedId)
            })

        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTON).find({ userId: new ObjectId(userId) }).toArray()
            resolve(orders)
        }
        )
    },
    getOrderProducts: (orderId) => {

        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTON).aggregate([
                {
                    $match: { _id: new ObjectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            resolve(orderItems)
        })

    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total*100,
                currency: "INR",
                receipt: "" + orderId
            }
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);

                } else {
                    console.log("New Order:", order)
                    resolve(order)
                }
            })



        })

    },
    verifyPayment: (details) => {
        return new Promise((reslove, reject) => {
            const crypto= require('crypto');
              let hmac =crypto.createHmac('sha256', 'R7dzZ0XLUr4jPFenOXq1Js8s');

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if (hmac==details['payment[razorpay_signature]']){
                reslove()
            }else{
                reject()
            }


        })
    },
    
    changePayementStatus:(orderId)=>{
        console.log(orderId)
      
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTON).updateOne({ _id: new ObjectId(orderId)},
          
            {
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
        })
        })
    }

}