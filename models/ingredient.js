const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    name: String,   //NAME OF THE INGREDIENT
    bestDishWith: String,   //BEST DISH WITH THIS INGREDIENT
    user: String,   //USER
    quantity: Number,   //INGREDIENTS QUANTITY
    recipe: String,     //RECIPE TO DO WITH INGREDIENT
    date: {             //DATE OF CREATION
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);