const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
    image: String,  //IMAGE OF A FAVORITE RECIPE
    title: String,  //TITLE OF A FAVORITE RECIPE
    description: String,    //WHY USER LIKE THIS FAVORITE RECIPE
    user: String,   //USER WHO CREATE THIS RECIPE
    date: {         //DATE OF CREATION OF THE FAVOURITE RECIPE
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model('Favourite', favouriteSchema);