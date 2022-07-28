const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    store: mongoose.Schema.Types.ObjectId,
    name: String,
    description: String,
    image: String,
    available: Boolean,
    price_list: [
      {
        size: String,
        description: String,
        price: Number,
      },
    ],
  },
  { collection: "products" }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
