let mongoose = require('mongoose');
let inventoryModel = require('./inventories')

let productSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String
    },
    price: {
        type: Number,
        min: 0,
        default: 0
    },
    description: {
        type: String,
        default: true,
        maxLength: 999
    },
    category: {
        type: mongoose.Types.ObjectId,
        ref: 'category',
        required: true
    },
    images: {
        type: [String],
        default: [
            "https://placeimg.com/640/480/any"
        ]
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
})

productSchema.pre('save', function () {
    this._wasNew = this.isNew
})

productSchema.post('save', async function (doc) {
    if (!doc?._wasNew) return
    await inventoryModel.findOneAndUpdate(
        { product: doc._id },
        {
            $setOnInsert: {
                product: doc._id,
                stock: 0,
                reserved: 0,
                soldCount: 0
            }
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    )
})

module.exports = new mongoose.model('product', productSchema)
