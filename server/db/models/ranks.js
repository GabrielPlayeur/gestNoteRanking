const mongoose = require('mongoose');

const ranksSchema = new mongoose.Schema({
  hash: {
    type: String,
    unique: true,
    },
  year: Number,
  maquette: Number,
  departement: Number,
  grade: mongoose.Schema.Types.Decimal128,
});

const ranksModel = mongoose.model('ranks', ranksSchema);

module.exports = ranksModel;