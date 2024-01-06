const { MongoClient } = require("mongodb");

const state = {
  db: null,
};

// mongodb connection string
const url = "mongodb://localhost:27017";
// database name
const dbName = "shopping";

// create a new mongodb client object
const client = new MongoClient(url);

// function to establish mongodb connection
module.exports.connect = async (done) => {
  try {
    // connecting to mongodb
    await client.connect();
    // setting up database name to the connected client
    const db = client.db(dbName);
    // setting up database name to the state
    state.db = db;
    // callback after connected
      done();
  } catch (err) {
    // callback when an error occurs
      done(err);
  }
};

// function to get the database instance
module.exports.get = () => state.db;

// exporting functions

