const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    name: String,   //NAME OF THE RECIPE
    image: String,  //IMAGE OF THE RECIPE
    user: String    //USER WHO CREATE THE RECIPE
});

module.exports = mongoose.model('Recipe', recipeSchema);