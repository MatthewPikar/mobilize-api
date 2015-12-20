/**
 * Created by mattpiekarczyk on 11/4/15.
 */
"use strict";

var _ = require('lodash');
var commandlineParameters = {};

for(var i= 2, len=process.argv.length; i<len; i++){
    var argument = process.argv[i].split(':');
    commandlineParameters[argument[0]] = argument[1];
}

var seneca = require('seneca')()
    .use('redis-transport')
    .use('api.js', _.extend({prefix:'/api/0.1',
        pins:['movements','events']
    }, commandlineParameters))
    .client({type:'redis', pin:'role:movements,cmd:*'})
    ;

/*setInterval(function () {
    seneca.act({role:'movements', cmd:'query', requestId:'foo', query:'foo'}, function(err,res){
        if(err)
            console.log("noooo");
        else if(res)
            console.log("yesss");
    });
}, 1111)*/

var app = require('express')()
    .use(require('body-parser').json())
    .use(seneca.export('web'))
    .listen(8080)
    ;
