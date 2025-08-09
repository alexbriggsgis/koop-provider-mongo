const fs = require('fs');
const _ = require('lodash');
const zlib = require('zlib');
const path = require('path');
const { pipeline } = require('stream/promises');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { UUID } = require('bson');
const config = require('config');

const uri = "mongodb://localhost:27017";
const scriptDir = __dirname;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  pkFactory: { createPk: () => new UUID().toString() },
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Use absolute paths by joining with the script directory
    const gzipPath = path.join(scriptDir, 'test-data.json.gz');
    const outputPath = path.join(scriptDir, 'wildfires.json');

    console.log(`Reading from: ${gzipPath}`);
    console.log(`Writing to: ${outputPath}`);

    await pipeline(
      fs.createReadStream(gzipPath),
      zlib.Unzip(),
      fs.createWriteStream(outputPath),
    );

    const db = client.db('sample-data');
    const firesCollection = db.collection('fires');
    const features = require('./wildfires.json');

    const chunks = _.chain(features)
      .map((feature) => {
        const { properties, geometry } = feature;
        return {
          fireId: properties.FIRE_ID,
          fireName: properties.FIRE_NAME,
          fireType: properties.FIRE_TYPE,
          acres: properties.ACRES,
          location: geometry,
        };
      })
      .chunk(1000)
      .value();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      await firesCollection.insertMany(chunk);
    }
    console.log(`fire data loaded`);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
