/**
 * Created by mattpiekarczyk on 11/4/15.
 */
"use strict";

var _ = require('lodash');
var Promise = require('bluebird');
var response = require('response');


module.exports = function api(options) {
    var seneca = this;
    var act = Promise.promisify(seneca.act, {context:seneca});

    options = seneca.util.deepextend({
        prefix: '/api',

        startware:noware,
        premap:noware,
        postmap:noware,
        endware:noware,

        meta:true,
        pins: ['resource']
    },options);

    var pins = options.pins;
    pins = pins ? _.isArray(pins) ? pins : [pins] : options.pins;
    for (var i = 0, len = pins.length; i < len; i++) {
        pins[i] = {resourceType: pins[i]};
    }

    _.each(pins, function (pin) {
        seneca.add(_.extend({}, pin, {role: 'api', prefix: options.prefix, method: 'get'}), getResource);
        seneca.add(_.extend({}, pin, {role: 'api', prefix: options.prefix, method: 'put'}), putResource);
        seneca.add(_.extend({}, pin, {role: 'api', prefix: options.prefix, method: 'post'}), postResource);
        seneca.add(_.extend({}, pin, {role: 'api', prefix: options.prefix, method: 'delete'}), deleteResource);
    });

    _.each(pins, function (pin) {
        pin = _.extend({}, pin, {role: 'api', prefix: options.prefix, method: '*'});

        seneca.act('role: web',{
            use: {
                prefix: options.prefix,
                pin: pin,
                startware: options.startware,
                premap: options.premap,
                map: {
                    get: {GET: resolve, alias: ':resource/:id?'},
                    delete: {DELETE: resolve, alias: ':resource/:id'},
                    put: {PUT: resolve, alias: ':resource/:id', data: true},
                    post: {POST: resolve, alias: ':resource', data: true}
                },
                postmap: options.postmap,
                endware: options.endware
            }},
            function(err, res){
                    if (err) return respond(err, null);
                    else return respond(null, res);
    })});

    function resolve(req,res,args,act,respond) {
        args.name  = req.params.resource;

        return act(args,respond);
    }


    function getResource(args,respond){
        // if id is provided single item is returned
        if (args.id) {
            return seneca.act({role: args.name, cmd: 'get', id: args.id}, function(err, res){
                if (err) {
                    console.log(err);
                    return respond(null, err);
                }
                else return respond(null, res);
            });
        }
        // if id is not provided treat it like a query and return an array of items
        else {
            // Clean and add options to service call if provided.
            try {
                // If provided, format arguments into proper types.
                var queryArgs = {};
                if (typeof args.sort !== "undefined") {
                    var sort = args.sort.split(':');
                    sort = parseJSON('{"' + sort[0] + '":' + sort[1] + '}');
                    queryArgs = _.extend(queryArgs,{sort: sort});
                }
                if (typeof args.fields !== "undefined") {
                    var fields = parseJSON(args.fields.split(','));
                    queryArgs = _.extend(queryArgs,{fields: fields});
                }
                if (typeof args.limit !== "undefined") {
                    var limit = parseInt(args.limit, 10);
                    if (isNaN(args.limit)) return respond(new Error("Limit is not an integer"));
                    queryArgs = _.extend(queryArgs, {limit: limit});
                }
                if (typeof args.skip !== "undefined") {
                    var skip = parseInt(args.skip, 10);
                    if (isNaN(args.skip)) return respond(new Error("Skip is not an integer"));
                    queryArgs = _.extend(queryArgs, {skip: skip});
                }
                if (typeof args.query !== "undefined")
                    queryArgs = _.extend(queryArgs, {query: args.query});
            } catch (err){
                console.log(err);
                return respond(err, null);
            }

            act(_.extend({role: args.name, cmd: 'query'},queryArgs))
                .then(function(res){
                    return respond(null, res);
                })
                .catch(function(err){
                    return respond(null, err);
                });

            /*            seneca.act(_.extend({role: args.name, cmd: 'query'},queryArgs),
                            function(err, res){
                                if (err) {
                                    //respond(err, null);
                                    respond(err, null);
                                }
                                else  return respond(null, res);
                        });
                        */
        }
    }

    function putResource(args,respond) {
        return seneca.act({role:args.name, cmd:'modify', id:args.id, movement:args.data.movement}, respond);
    }

    function postResource(args,respond) {
        return seneca.act({role:args.name, cmd:'add', movement:args.data.movement}, respond);
    }

    function deleteResource(args,respond){
        return seneca.act({role:args.name, cmd:'delete', id:args.id}, respond);
    }
};

function noware(req,res,done) {return done();}
function parseJSON(o) {return (o === null) ? {} : _.isString(o) ? JSON.parse(o) : o;}