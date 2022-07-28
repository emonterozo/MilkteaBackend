const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    customer: mongoose.Schema.Types.ObjectId,
    owner: mongoose.Schema.Types.ObjectId,
    store: mongoose.Schema.Types.ObjectId,
    product: mongoose.Schema.Types.ObjectId,
    size: String,
    quantity: Number,
    unit_price: Number,
    amount: Number,
    status: String,
    timestamp: mongoose.Schema.Types.Date,
  },
  { collection: "orders" }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
