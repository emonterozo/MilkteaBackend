const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const storeSchema = new Schema(
  {
    owner: mongoose.Schema.Types.ObjectId,
    username: String,
    password: String,
    banner: String,
    store_name: String,
    store_contact_number: String,
    store_address: String,
    latitude: Number,
    longitude: Number,
    store_ratings: [
      {
        rating: Number,
        count: Number,
      },
    ],
    rate_by: [
      {
        customer: String,
        rate: Number,
      },
    ],
  },
  { collection: "stores" }
);

const Store = mongoose.model("Store", storeSchema);

module.exports = Store;
