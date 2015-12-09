/**
 * Created by mattpiekarczyk on 11/4/15.
 */
"use strict";

var seneca = require('seneca')({})
    .use('api.js', {tag$:'api', prefix:'/api/0.1',
        pins:['movements','events']
    })
    .client({type:'tcp', port:'30010', pin:'role:movements'})
    ;

seneca.act('role:web, list:route', function(err, routes) {
    console.log("\nRoutes: \n");
    routes.forEach(function(entry){
        console.log(JSON.stringify(entry) + "\n")
    });
});

var app = require('express')()
    .use(require('body-parser').json())
    .use(seneca.export('web'))
    .listen(8080)
    ;