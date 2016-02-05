/**
 * Created by mattpiekarczyk on 11/4/15.
 */
"use strict"

var _ = require('lodash')
var commandlineParameters = {}

for(var i= 2, len=process.argv.length; i<len; i++){
    var argument = process.argv[i].split(':')
    commandlineParameters[argument[0]] = argument[1]
}

var transport = require('seneca-redis-transport')
var api = require('./api.js')

var seneca = require('seneca')()
    .use(transport)
    .use(api, _.extend({prefix:'/api/0.1',
        pins:['movements','events','actions', 'users']
    }, commandlineParameters))
    .client({type:'redis', pin:'role:movements,cmd:*'})
    .client({type:'redis', pin:'role:events,cmd:*'})
    .client({type:'redis', pin:'role:actions,cmd:*'})
    .client({type:'redis', pin:'role:users,cmd:*'})

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:8000')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With')

    if ('OPTIONS' === req.method) res.sendStatus(200)
    else next()
}

var app = require('express')()
    .use(require('body-parser').json())
    .use(allowCrossDomain)
    .use(seneca.export('web'))
    .listen(8080)

