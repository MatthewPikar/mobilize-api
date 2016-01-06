/**
 * Created by mattpiekarczyk on 11/4/15.
 */
"use strict"

var _ = require('lodash')
var Promise = require('bluebird')
var Response = require('response')


// todo: factor out id generation to an external package/service
// todo: check for proper header fields like: content-type
// todo: handle service timeouts
// todo: figure out why empty id strings return 404 in delete
function generateId(){
    var len = 16

    return _.random(Number.MAX_SAFE_INTEGER)
        .toString(16)
        .slice(0,len)
}


module.exports = function api(options) {
    var seneca = this
    seneca.options({errhandler:errorHandler})
    var act = Promise.promisify(seneca.act, {context:seneca})

    options = seneca.util.deepextend({
        prefix: '/api',
        pins: ['r'],
        debug: false
    },options)

    var response = new Response({context:'api', debug:!!options.debug})

    var pins = options.pins
    pins = pins ? _.isArray(pins) ? pins : [pins] : options.pins
    for (var i = 0, len = pins.length; i < len; i++)
        pins[i] = {role: 'api', prefix: options.prefix, resourceType: pins[i]}

    _.each(pins, function (pin) {
        seneca.add(_.extend({}, pin, {method: 'get'}),      getResource)
        seneca.add(_.extend({}, pin, {method: 'query'}),    queryResource)
        seneca.add(_.extend({}, pin, {method: 'put'}),      putResource)
        seneca.add(_.extend({}, pin, {method: 'post'}),     postResource)
        seneca.add(_.extend({}, pin, {method: 'delete'}),   deleteResource)
    })

    _.each(pins, function (pin) {
        pin = _.extend({}, pin, {method: '*'})

        act('role: web',{
            use: {
                prefix: options.prefix,
                pin: pin,
                map: {
                    get:    {GET: premap,      alias: ':resource/:id?', modify:modifyResponse},
                    delete: {DELETE: premap,   alias: ':resource/:id', modify:modifyResponse},
                    put:    {PUT: premap,      alias: ':resource', modify:modifyResponse,     data: true},
                    post:   {POST: premap,     alias: ':resource', modify:modifyResponse,     data: true}
                }
            }}
        )

        })

    function premap(req,res,args,act,respond) {
        args.name  = req.params.resource

        return act(args,respond)
    }

    function modifyResponse(result){
        // only return an array for queries
        //var resources = _.has(result.out, 'query') ? result.out.resources: result.out.resources[0]
        // add custom headers
        /*
        var headers = {"content-type":"application/json"}
        result.out = result.out.resources

        var foo = {"err":null,
            "out":{
                "requestId":"98c883f000000",
                "query":"","limit":10,"skip":0,"fields":[],"sort":{},"latency":19,
                "resources":
                    [{"id":"b48d1cee00000","name":"foo","description":"foo"},
                        {"id":"1cb14f04e00000","name":"foo2","description":"foo2"}],
                "context":"api",
                "http$":{
                    "status":200,
                    "headers":{
                        "date":"Sun, 03 Jan 2016 01:20:32 GMT",
                        "content-type":"application/json"
                    }
                }
            }
        }

        var clean = function(item) {
            if( _.isObject( item ) ) {
                _.each(item,function(v,k){
                    if(~k.indexOf('$') && 'http$' !== k) {
                        delete item[k]
                    }
                })
            }
        }

        console.log(JSON.stringify(result))
        if( _.isArray( result.out ))    _.each(result.out, clean)
        else                            clean(result.out)
        */
    }

    function getResource(args,respond){
        var startTime = Date.now()

        // if id is provided single item is returned
        if (args.id)
            act({role: args.name, cmd: 'get', requestId:generateId(), id: args.id.replace(/[^\w.]/gi, '')})
                .then( function(res){
                    return response.forward(res, {latency: (Date.now()-startTime)}, respond) })
                .catch(function(err){
                    if(err.timeout) return response.make(504, {error: err}, respond)
                    else return response.make(500, {error: err}, respond)
                })

        // if id is not provided treat it like a query and return an array of items
        else queryResource(args,respond)
    }

    function queryResource(args, respond) {
        var startTime = Date.now()

        var queryArgs = {}
        // If provided, clean and format arguments into proper types.
        try {
            if (typeof args.sort === "string") {
                var sort = args.sort.split(':')
                sort = JSON.parse('{"' + sort[0].replace(/[^\w]/gi, '') + '":' + !!sort[1] + '}')
                queryArgs = _.extend(queryArgs, {sort: sort})
            }
            if (typeof args.fields === "string") {
                var fields = (args.fields.replace(/[^\s\,]/gi, '')).split(',')
                queryArgs = _.extend(queryArgs, {fields: fields})
            }
            if (typeof args.limit === "string")
                queryArgs = _.extend(queryArgs, {limit: parseInt(args.limit, 10)})
            if (typeof args.skip === "string")
                queryArgs = _.extend(queryArgs, {skip: parseInt(args.skip, 10)})
            if (typeof args.query === "string")
                queryArgs = _.extend(queryArgs, {query: args.query.replace(/[^\w\s]/gi, ' ')})
        } catch (err) {
            return response.make(400, err)
        }

        act(_.extend({role: args.name, cmd: 'query', requestId:generateId()}, queryArgs))
            .then( function(res){
                return response.forward(res, {latency: (Date.now()-startTime)}, respond)  })
            .catch(function(err){
                if(err.timeout) return response.make(504, {error: err}, respond)
                else return response.make(500, {error: err}, respond)
            })
    }

    function putResource(args,respond) {
        var startTime = Date.now()

        act({role:args.name, cmd:'modify', requestId:generateId(), resources:args.data.resources})
            .then( function(res){
                return response.forward(res, {latency: (Date.now()-startTime)}, respond)  })
            .catch(function(err){
                if(err.timeout) return response.make(504, {error: err}, respond)
                else return response.make(500, {error: err}, respond)
            })
    }

    function postResource(args,respond) {
        var startTime = Date.now()

        act({role:args.name, cmd:'add',    requestId:generateId(), resources:args.data.resources})
            .then( function(res){
                return response.forward(res, {latency: (Date.now()-startTime)}, respond)  })
            .catch(function(err){
                if(err.timeout) return response.make(504, {error: err}, respond)
                else return response.make(500, {error: err}, respond)
            })
    }

    function deleteResource(args,respond){
        var startTime = Date.now()

        act({role:args.name, cmd:'delete', requestId:generateId(), id:args.id.replace(/[^\w.]/gi, '')})
            .then( function(res){return response.forward(res, {latency: (Date.now()-startTime)}, respond)  })
            .catch(function(err){
                if(err.timeout) return response.make(504, {error: err}, respond)
                else return response.make(500, {error: err}, respond)
            })
    }

    function errorHandler(error){
        response.make(500, {error: error})
    }
}
