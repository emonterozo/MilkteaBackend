const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const mongoose = require("mongoose");
const moment = require("moment");
const _ = require("lodash");

const { jwtSign } = require("../utils/utils");
const { MONTHS } = require("../utils/constant");
const { verifyToken } = require("../middleware/authorization");

const saltRounds = 10;

const User = require("../models/User");
const Store = require("../models/Store");
const Order = require("../models/Order");
const Product = require("../models/Product");

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const users = await User.find({ provider: "email", email: email });

  if (users.length) {
    res.status(200).json({ data: null, error: "Email already exist" });
  } else {
    bcrypt.hash(password, saltRounds, async (err, hash) => {
      const user = await User.create({
        name: name,
        email: email,
        password: hash,
        provider: "email",
        identifier: null,
      });
      const token = jwtSign(user.id);
      res.status(200).json({
        data: {
          user: user,
          token: token,
        },
        error: null,
      });
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = await User.find({ provider: "email", email: email });

  if (users.length) {
    bcrypt.compare(password, users[0].password, (err, result) => {
      if (result) {
        const token = jwtSign(users[0].id);
        res.status(200).json({
          data: {
            user: users[0],
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

router.post("/social", async (req, res) => {
  const { identifier, provider, name, email } = req.body;
  const users = await User.find({ provider: provider, identifier: identifier });

  if (users.length) {
    const token = jwtSign(users[0].id);
    res.status(200).json({
      data: {
        user: users[0],
        token: token,
      },
      error: null,
    });
  } else {
    const user = await User.create({
      name: name,
      email: email,
      password: null,
      provider: provider,
      identifier: identifier,
    });
    const token = jwtSign(user.id);
    res.status(200).json({
      data: {
        user: user,
        token: token,
      },
      error: null,
    });
  }
});

router.post("/add_store", verifyToken, async (req, res) => {
  const {
    username,
    password,
    storeName,
    storeContactNumber,
    storeAddress,
    latitude,
    longitude,
    owner,
    banner,
  } = req.body;

  const storeUsername = await Store.find({ username: username });

  if (storeUsername.length) {
    res.status(200).json({ error: "Username already exist" });
  } else {
    bcrypt.hash(password, saltRounds, async (err, hash) => {
      await Store.create({
        owner: owner,
        username: username,
        password: hash,
        banner: banner,
        store_name: storeName,
        store_contact_number: storeContactNumber,
        store_address: storeAddress,
        latitude: latitude,
        longitude: longitude,
        store_ratings: [
          {
            rating: 1,
            count: 0,
          },
          {
            rating: 2,
            count: 0,
          },
          {
            rating: 3,
            count: 0,
          },
          {
            rating: 4,
            count: 0,
          },
          {
            rating: 5,
            count: 0,
          },
        ],
        rate_by: [],
      });
      res.status(200).json({ error: "" });
    });
  }
});

router.get("/stores", verifyToken, async (req, res) => {
  const { owner } = req.query;

  const stores = await Store.find({ owner: owner });
  res.status(200).json({ stores: stores });
});

router.post("/add_product", verifyToken, async (req, res) => {
  const { storeId, name, description, image, available, small, medium, large } =
    req.body;

  const product = {
    store: storeId,
    name: name,
    description: description,
    image: image,
    available: available,
    price_list: [
      {
        size: "Small",
        description: "12oz",
        price: small,
      },
      {
        size: "Medium",
        description: "16oz",
        price: medium,
      },
      {
        size: "Large",
        description: "24oz",
        price: large,
      },
    ],
  };

  await Product.create(product);
  res.sendStatus(200);
});

router.get("/store", verifyToken, async (req, res) => {
  const { id } = req.query;

  const store = await Store.findById(id);
  const products = await Product.find({ store: id });
  res.status(200).json({ store: store, products: products });
});

router.post("/update_product", verifyToken, async (req, res) => {
  const {
    productId,
    name,
    description,
    image,
    available,
    small,
    medium,
    large,
  } = req.body;

  const price_list = [
    {
      size: "Small",
      description: "12oz",
      price: small,
    },
    {
      size: "Medium",
      description: "16oz",
      price: medium,
    },
    {
      size: "Large",
      description: "24oz",
      price: large,
    },
  ];

  Product.findByIdAndUpdate(
    productId,
    {
      $set: {
        name: name,
        description: description,
        image: image,
        available: available,
        price_list: price_list,
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

router.get("/dashboard", verifyToken, async (req, res) => {
  const { owner, startDate, endDate } = req.query;

  const previousYear = {
    startDate: moment(startDate).subtract(1, "year").format("YYYY-MM-DD"),
    endDate: moment(endDate).subtract(1, "year").format("YYYY-MM-DD"),
  };

  const start = moment(startDate).month() + 1;
  const end = moment(endDate).month() + 1;
  const range = _.range(start, end + 1, 1);

  const currentYearSales = await Order.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(owner),
        status: "Completed",
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(`${endDate} 23:59:59`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: {
            $month: "$timestamp",
          },
          year: {
            $year: "$timestamp",
          },
        },
        revenue: {
          $sum: {
            $toInt: "$amount",
          },
        },
      },
    },
    {
      $project: {
        revenue: "$revenue",
        month: {
          $arrayElemAt: [
            [
              "",
              "JAN",
              "FEB",
              "MAR",
              "APR",
              "MAY",
              "JUN",
              "JUL",
              "AUG",
              "SEP",
              "OCT",
              "NOV",
              "DEC",
            ],
            "$_id.month",
          ],
        },
      },
    },
  ]);
  const previousYearSales = await Order.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(owner),
        status: "Completed",
        timestamp: {
          $gte: new Date(previousYear.startDate),
          $lte: new Date(`${previousYear.endDate} 23:59:59`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: {
            $month: "$timestamp",
          },
          year: {
            $year: "$timestamp",
          },
        },
        revenue: {
          $sum: {
            $toInt: "$amount",
          },
        },
      },
    },
    {
      $project: {
        revenue: "$revenue",
        month: {
          $arrayElemAt: [
            [
              "",
              "JAN",
              "FEB",
              "MAR",
              "APR",
              "MAY",
              "JUN",
              "JUL",
              "AUG",
              "SEP",
              "OCT",
              "NOV",
              "DEC",
            ],
            "$_id.month",
          ],
        },
      },
    },
  ]);

  let holderCurrentYearSales = currentYearSales;
  range.map((i) => {
    const dateExist = currentYearSales.some((data) => data._id.month === i);
    if (!dateExist) {
      holderCurrentYearSales.push({
        _id: { month: i, year: moment(startDate).year() },
        revenue: 0,
        month: MONTHS[i - 1],
      });
    }
  });
  let holderPreviousYearSales = previousYearSales;
  range.map((i) => {
    const dateExist = previousYearSales.some((data) => data._id.month === i);
    if (!dateExist) {
      holderPreviousYearSales.push({
        _id: { month: i, year: moment(previousYear.startDate).year() },
        revenue: 0,
        month: MONTHS[i - 1],
      });
    }
  });

  const stores = await Order.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(owner),
        status: "Completed",
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(`${endDate} 23:59:59`),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$timestamp" },
        },
        revenue: { $sum: "$amount" },
        quantity: { $sum: "$quantity" },
      },
    },
  ]);

  const storeCount = await Store.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(owner),
      },
    },
    {
      $group: {
        _id: {
          owner: "$owner",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    storeCount: storeCount,
    stores: stores,
    sales: {
      [moment(startDate).year()]: _.orderBy(
        holderCurrentYearSales,
        "_id.month",
        "asc"
      ),
      [moment(previousYear.startDate).year()]: _.orderBy(
        holderPreviousYearSales,
        "_id.month",
        "asc"
      ),
    },
  });
});

router.get("/store_sales", verifyToken, async (req, res) => {
  const { store, yearStartDate, yearEndDate, monthStartDate, monthEndDate } =
    req.query;

  const start = moment(yearStartDate).month() + 1;
  const end = moment(yearEndDate).month() + 1;
  const range = _.range(start, end + 1, 1);

  const currentYearSales = await Order.aggregate([
    {
      $match: {
        store: mongoose.Types.ObjectId(store),
        status: "Completed",
        timestamp: {
          $gte: new Date(yearStartDate),
          $lte: new Date(`${yearEndDate} 23:59:59`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: {
            $month: "$timestamp",
          },
          year: {
            $year: "$timestamp",
          },
        },
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $project: {
        revenue: "$totalAmount",
        month: {
          $arrayElemAt: [
            [
              "",
              "JAN",
              "FEB",
              "MAR",
              "APR",
              "MAY",
              "JUN",
              "JUL",
              "AUG",
              "SEP",
              "OCT",
              "NOV",
              "DEC",
            ],
            "$_id.month",
          ],
        },
      },
    },
  ]);

  if (currentYearSales.length) {
    let holderCurrentYearSales = currentYearSales;
    range.map((i) => {
      const dateExist = currentYearSales.some((data) => data._id.month === i);
      if (!dateExist) {
        holderCurrentYearSales.push({
          _id: { month: i, year: moment(yearStartDate).year() },
          revenue: 0,
          month: MONTHS[i - 1],
        });
      }
    });

    const productSales = await Product.aggregate([
      {
        $match: {
          store: mongoose.Types.ObjectId(store),
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "product",
          as: "orders",
        },
      },
      {
        $unwind: "$orders",
      },
      {
        $match: {
          "orders.status": "Completed",
          "orders.timestamp": {
            $gte: new Date(monthStartDate),
            $lte: new Date(`${monthEndDate} 23:59:59`),
          },
        },
      },
      {
        $group: {
          _id: {
            productId: "$_id",
            name: "$name",
            price_list: "$price_list",
          },
          totalQuantity: {
            $sum: "$orders.quantity",
          },
          totalSales: {
            $sum: "$orders.amount",
          },
        },
      },
      {
        $project: {
          _id: "$_id.productId",
          name: "$_id.name",
          sales: "$totalSales",
          quantity: "$totalQuantity",
        },
      },
    ]);

    console.log(productSales);

    res.status(200).json({
      data: {
        store_monthly_sales: _.orderBy(
          holderCurrentYearSales,
          "_id.month",
          "asc"
        ),
        product_monthly_sales: productSales,
      },
    });
  } else {
    res.status(200).json({
      data: null,
    });
  }
});

module.exports = router;
