const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const mongoose = require("mongoose");
const moment = require("moment");
const _ = require("lodash");

const { jwtSign } = require("../utils/utils");
const { MONTHS, ORDER_STATUS } = require("../utils/constant");
const { verifyToken } = require("../middleware/authorization");

const Store = require("../models/Store");
const Product = require("../models/Product");
const Order = require("../models/Order");

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const store = await Store.find({ username: username });

  if (store.length) {
    bcrypt.compare(password, store[0].password, (err, result) => {
      if (result) {
        const token = jwtSign(store[0].id);
        res.status(200).json({
          data: {
            store: store[0],
            token: token,
          },
          error: null,
        });
      } else {
        res.status(200).json({ data: null, error: "Invalid credentials" });
      }
    });
  } else {
    res.status(200).json({ data: null, error: "Account does not exist" });
  }
});

router.get("/products", verifyToken, async (req, res) => {
  const { store } = req.query;
  const products = await Product.find({ store: store });
  res.status(200).json({ products: products });
});

router.post("/product_availability", verifyToken, async (req, res) => {
  const { product, available } = req.body;
  Product.findByIdAndUpdate(
    product,
    {
      $set: {
        available: available,
      },
    },
    function (err, result) {
      if (err) {
        res.sendStatus(500);
      }
      res.sendStatus(200);
    }
  );
});

router.post("/add_order", verifyToken, async (req, res) => {
  const { owner, store, product, size, quantity, price, amount, timestamp } =
    req.body;
  const order = {
    customer: null,
    owner: owner,
    store: store,
    product: product,
    size: size,
    quantity: quantity,
    unit_price: price,
    amount: amount,
    status: ORDER_STATUS.PROCESSING,
    timestamp: timestamp,
  };

  await Order.create(order);
  res.sendStatus(200);
});

router.get("/orders", verifyToken, async (req, res) => {
  const { store, status, timestamp } = req.query;

  const orders = await Order.aggregate([
    {
      $match: {
        status: status,
        store: mongoose.Types.ObjectId(store),
        timestamp: {
          $gte: new Date(`${timestamp} 00:59:59`),
          $lte: new Date(`${timestamp} 23:59:59`),
        },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "products",
      },
    },
  ]);

  const formattedOrders = orders.map((order) => {
    const productDetails = order.products.map((product) => {
      return {
        name: product.name,
        description: product.description,
        image: product.image,
      };
    });

    return {
      ...productDetails[0],
      id: order._id,
      size: order.size,
      quantity: order.quantity,
      unit_price: order.unit_price,
      amount: order.amount,
      status: order.status,
    };
  });

  res.status(200).json({ orders: formattedOrders });
});

router.post("/update_order", verifyToken, async (req, res) => {
  const { order, status } = req.body;
  Order.findByIdAndUpdate(
    order,
    {
      $set: {
        status: status,
      },
    },
    function (err, result) {
      if (err) {
        res.sendStatus(500);
      }
      res.sendStatus(200);
    }
  );
});

module.exports = router;
