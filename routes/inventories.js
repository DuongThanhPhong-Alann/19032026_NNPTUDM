var express = require('express');
var router = express.Router();
let mongoose = require('mongoose')

let inventoryModel = require('../schemas/inventories')
let productModel = require('../schemas/products')

function parseQuantity(value) {
    let quantity = Number(value)
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        return null
    }
    return quantity
}

async function ensureProductExists(productId) {
    return productModel.exists({ _id: productId, isDeleted: false })
}

router.get('/', async function (req, res) {
    let data = await inventoryModel.find().populate({
        path: 'product'
    })
    res.send(data)
});

router.post('/add_stock', async function (req, res) {
    try {
        let product = req.body.product
        let quantity = parseQuantity(req.body.quantity)
        if (!mongoose.Types.ObjectId.isValid(product) || quantity === null) {
            return res.status(400).send({ message: "INVALID INPUT" })
        }
        let productExists = await ensureProductExists(product)
        if (!productExists) {
            return res.status(404).send({ message: "PRODUCT NOT FOUND" })
        }

        let updated = await inventoryModel.findOneAndUpdate(
            { product: product },
            {
                $inc: { stock: quantity },
                $setOnInsert: { product: product, reserved: 0, soldCount: 0 }
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        )
        res.send(updated)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

router.post('/remove_stock', async function (req, res) {
    try {
        let product = req.body.product
        let quantity = parseQuantity(req.body.quantity)
        if (!mongoose.Types.ObjectId.isValid(product) || quantity === null) {
            return res.status(400).send({ message: "INVALID INPUT" })
        }
        let productExists = await ensureProductExists(product)
        if (!productExists) {
            return res.status(404).send({ message: "PRODUCT NOT FOUND" })
        }

        let updated = await inventoryModel.findOneAndUpdate(
            { product: product, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true, runValidators: true }
        )
        if (!updated) {
            let inv = await inventoryModel.findOne({ product: product })
            if (!inv) return res.status(404).send({ message: "INVENTORY NOT FOUND" })
            return res.status(400).send({ message: "NOT ENOUGH STOCK" })
        }
        res.send(updated)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

router.post('/reservation', async function (req, res) {
    try {
        let product = req.body.product
        let quantity = parseQuantity(req.body.quantity)
        if (!mongoose.Types.ObjectId.isValid(product) || quantity === null) {
            return res.status(400).send({ message: "INVALID INPUT" })
        }
        let productExists = await ensureProductExists(product)
        if (!productExists) {
            return res.status(404).send({ message: "PRODUCT NOT FOUND" })
        }

        let updated = await inventoryModel.findOneAndUpdate(
            { product: product, stock: { $gte: quantity } },
            { $inc: { stock: -quantity, reserved: quantity } },
            { new: true, runValidators: true }
        )
        if (!updated) {
            let inv = await inventoryModel.findOne({ product: product })
            if (!inv) return res.status(404).send({ message: "INVENTORY NOT FOUND" })
            return res.status(400).send({ message: "NOT ENOUGH STOCK" })
        }
        res.send(updated)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

router.post('/sold', async function (req, res) {
    try {
        let product = req.body.product
        let quantity = parseQuantity(req.body.quantity)
        if (!mongoose.Types.ObjectId.isValid(product) || quantity === null) {
            return res.status(400).send({ message: "INVALID INPUT" })
        }
        let productExists = await ensureProductExists(product)
        if (!productExists) {
            return res.status(404).send({ message: "PRODUCT NOT FOUND" })
        }

        let updated = await inventoryModel.findOneAndUpdate(
            { product: product, reserved: { $gte: quantity } },
            { $inc: { reserved: -quantity, soldCount: quantity } },
            { new: true, runValidators: true }
        )
        if (!updated) {
            let inv = await inventoryModel.findOne({ product: product })
            if (!inv) return res.status(404).send({ message: "INVENTORY NOT FOUND" })
            return res.status(400).send({ message: "NOT ENOUGH RESERVED" })
        }
        res.send(updated)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

router.get('/:id', async function (req, res) {
    try {
        let id = req.params.id;
        let result = await inventoryModel.findById(id).populate({
            path: 'product'
        })
        if (result) {
            res.send(result)
        } else {
            res.status(404).send({
                message: "ID NOT FOUND"
            })
        }
    } catch (error) {
        res.status(404).send({
            message: error.message
        })
    }
});

module.exports = router;
