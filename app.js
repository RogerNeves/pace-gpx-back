const express = require('express');
const fileUpload = require('express-fileupload')
const cors = require('cors')
const morgan = require('morgan')
const _ = require('lodash')
const app = express()

app.use(fileUpload({
    createParentPath: true
}));

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan('dev'))

const calculeRoute = require('./routes/calcule')

app.use('/calcule', calculeRoute)

app.listen(process.env.PORT || 3000)