
const filegeojson = require('@koopjs/provider-file-geojson');
const mongo = require('../mongo/src');

const outputs = []
const auths = []
const caches = []
const plugins = [
  {
    instance: filegeojson
  },
  {
    instance: mongo
  },
]
module.exports = [...outputs, ...auths, ...caches, ...plugins]
