const mongoose = require('mongoose');

const ranksSchema = new mongoose.Schema({
  hash: {
    type: String,
    //unique: true,
    },
  year: Number,
  semester: Number,
  average: mongoose.Schema.Types.Decimal128,
});

const ranksModel = mongoose.model('ranks', ranksSchema);

module.exports = ranksModel;