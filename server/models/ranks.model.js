const mongoose = require('mongoose');

const ranksSchema = new mongoose.Schema({
  hash: {
    type: String,
    unique: true,
    },
  year: {
    type: Number,
    required: true,
  },
  maquette: {
    type: Number,
    required: true,
  },
  departement: {
    type: Number,
    required: true,
  },
  grade: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
  },
});

const ranksModel = mongoose.model('ranks', ranksSchema);

module.exports = ranksModel;