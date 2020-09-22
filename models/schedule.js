const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    recipeName: String, //NAME OF THE RECIPE TO SCHEDULE
    scheduleDate: { //DATE OF SCHEDULE
        type: Date
    },
    user: String,   //USER-CREATOR
    cookingTime: String,//COOKING TIME
    date: {     //DATE OF CREATION OF THE SCHEDULE
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model('Schedule', scheduleSchema);