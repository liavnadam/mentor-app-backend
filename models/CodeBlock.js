// models/CodeBlock.js
const mongoose = require('mongoose');

const codeBlockSchema = new mongoose.Schema({
  
  title: { type: String, required: true },
  code: { type: String, required: true },
  solution: { type: String, optional: true } ,
  instructions: { type: String, required: true }  

});

module.exports = mongoose.model('CodeBlock', codeBlockSchema);
