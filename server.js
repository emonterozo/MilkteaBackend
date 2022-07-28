require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = express();
app.use(express.json());

const port = process.env.PORT;

const sellerRouter = require("./routes/seller");
const storeRouter = require("./routes/store");

app.use("/seller", sellerRouter);
app.use("/store", storeRouter);

app.listen(port, () => {
  console.log(`MilkteaBackend app listening on port ${port}`);
});
