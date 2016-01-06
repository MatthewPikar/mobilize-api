"use strict"

// todo: figure out why superagent doesn't parse json responses.  seems to be a bug.

var host = 'http://localhost',
    port = 8080,
    prefix = '/api/0.1',
    base = host+':'+port+prefix

var seneca = require('seneca')({})
    .use('api.js', {prefix:prefix, pins:['movements, actions']})
    .use('redis-transport')
    .client({type:'redis', pin:{role:'movements',cmd:'*'}})
    .client({type:'redis', pin:{role:'actions',cmd:'*'}})


var app = require('express')()
    .use(require('body-parser').json())
    .use(seneca.export('web'))
    .listen(port)

var Promise = require('bluebird'),
    request = require('superagent-bluebird-promise'),
    asPromised = require('chai-as-promised'),
    chai = require('chai').use(asPromised),
    expect = require('chai').expect

describe("api", function(){
    describe('movements', function(){
    var resourceType = 'movements',
        url = base+'/'+resourceType,
        contentType = 'application/json'

    var resourceId = []

/*     var resourceProcess
     before(function(){
         resourceProcess = spawn('node', ['../movements/movementsService.js', 'debug=true'])
         resourceProcess.on('error', function(err){
             console.log('Error: Failed to start Movements process!')
         })
         console.log('Movements process started.')
    })*/

    describe('post', function() {
        it('Should return a 400 status if any arguments are missing or malformed.', function () {
            var resource = [{
                "test":"test",
                "name":"foo",
                "description":0,
                "image":"I see a nose in every place",
                "organizers":[{"name":"matt"},{"name":"sharothi"}]
            }]

            return Promise.all([
                request.post(url), // no resources
                request.post(url).send({resources:resource})  //unexpected fields
            ]).catch(function(err){ expect(err).to.have.property('status', 400) })
        })
        it('Should return a 201 status and add the provided resource(s), but ignore any id fields.', function () {
            var resource = [{
                name:"i see a nose ",
                description:"on every face",
                image:"I see a nose in every place",
                organizers:[{"name":"matt"},{"name":"sharothi"}]
            }]
            var result = request.post(url).send({resources:resource}).promise()
            var resources = [
                {
                    "name":"wheel on the bus go",
                    "description":"round and round, round and round",
                    "image":"wheels on the bus go round and round, all around the town",
                    "organizers":[{"name":"matt"},{"name":"sharothi"}]
                },
                {
                    "name":"brown bear brown bear",
                    "description":"what do you see",
                    "image":"I see a red bird looking at me",
                    "organizers":[{"name":"matt"},{"name":"sharothi"}]
                }
            ]
            var results = request.post(url).send({resources:resources}).promise()

            result.then(function(res) {
                resourceId.push(res.body.resources[0].id)
            })
            results.then(function(res) {
                resourceId.push(res.body.resources[0].id)
                resourceId.push(res.body.resources[1].id)
            })

            return Promise.all([
                expect(result).to.eventually.have.property('status', 201),
                //expect(result).to.eventually.have.property('body.resources').to.have.length(1),
                //expect(result).to.eventually.have.property('body.resources[0].name', 'i see a nose'),
                expect(results).to.eventually.have.property('status', 201),
                //expect(results).to.eventually.have.property('body.resources').to.have.length(2),
                //expect(results).to.eventually.have.property('body.resources[1].name', 'brown bear brown bear')
            ])
                //.catch(function(error){console.log(JSON.stringify(error))})

            var tmp2 = {
                "requestId":"e1a1b79400000",
                "status":{"code":201,"message":"Created"},
                "resources":[
                    {
                        "id":"1c3acdbea00000",
                        "name":"i see a nose",
                        "description":"on every face",
                        "image":"I see a nose in every place",
                        "organizers":[{"name":"matt"},{"name":"sharothi"}]
                    }
                ],
                "context":"api"}

        })
        it('Should return a 409 status if any of the the provided resource(s) already exist.', function () {
            var resource = [{
                name:"i see a nose",
                description:"on every face",
                image:"I see a nose in every place",
                organizers:[{"name":"matt"},{"name":"sharothi"}]
            }]

            return Promise.all([
                request.post(url).send({resources:resource})
                ])
                .catch(function(err){ expect(err).to.have.property('status', 409) })
        })
    })
    describe('get', function() {
        it('Should return a 400 status if any arguments are missing or malformed.', function () {
            return Promise.all([
                request.get(url + '/' + resourceId[0]).query({fields:false})
            ]).catch(function(err){ expect(err).to.have.property('status', 400) })
        })
        it('Should return a 404 status if the resource does not exist.', function () {
            return Promise.all([
                request.get(url + '/test')
            ]).catch(function(err){ expect(err).to.have.property('status', 404) })
        })
        it('Should return a 200 status along with the resource corresponding to the provided id.', function () {
            var result = request.get(url + '/' + resourceId[0]).promise()

            return Promise.all([
                expect(result).to.eventually.have.property('status', 200),
            //    expect(result).to.eventually.have.property('body.resources[0].name', 'i see a nose')
            ])
        })
    })
    describe('put', function() {
        it('Should return a 400 status if any arguments are missing or malformed.', function () {
            var resource = [{
                "name":"i see a nose",
                "description":0,
                "image":"I see a nose in every place",
                "organizers":[{"name":"matt"},{"name":"sharothi"}]
            }]

            return Promise.all([
                request.put(url), // no resources
                request.put(url).send({resources:resource})  //bad field value
            ]).catch(function(err){ expect(err).to.have.property('status', 400) })
        })
        it('Should return a 404 status if any of the resources do not exist.', function () {
            var resource = [{
                "id": "test",
                "name":"foo",
                "organizers":[{"name":"matt"},{"name":"sharothi"}]
            }]

            return Promise.all([
                request.put(url).send({resources:resource})
            ]).catch(function(err){ expect(err).to.have.property('status', 404) })
        })
        it('Should return a 200 status and modify and return the target resource(s).', function () {
            var resource = [{
                "id": resourceId[0],
                "name":"i see a nose",
                "description":"test",
                "image":"I see a nose in every place",
                "organizers":[{"name":"matt"},{"name":"sharothi"}]
            }]
            var response = request.put(url).send({resources:resource}).promise()

            return Promise.all([
                expect(response).to.eventually.have.property('status', 200),
            //    expect(response).to.eventually.have.property('body.resources[0].description', 'test')
            ])
        })
    })
    describe('query', function() {
        it('Should return a 204 status if no matching movements are found.', function () {
            var result = request.get(url).query({query:"test"}).promise()

            return Promise.all([
                expect(result).to.eventually.have.property('status', 204)
            ])
        })
        it('Should return a 200/204 status and ignore malformed options fields and bad query characters', function () {
            var result1 = request.get(url).query({query:"i see:a}nose"}).promise()
            var result2 = request.get(url).query({query:"test", limit:false}).promise()

            return Promise.all([
                expect(result1).to.eventually.have.property('status', 200),
                expect(result2).to.eventually.have.property('status', 204)
            ])
        })
        it('Should return a 200 status along with the movements corresponding to the provided query.', function () {
            var result1 = request.get(url).promise()
            var result2 = request.get(url).query({query:"i see a nose"}).promise()

            return Promise.all([
                expect(result1).to.eventually.have.property('status', 200),
             //   expect(result1).to.eventually.have.property('body.resources').to.have.length(3),
                expect(result2).to.eventually.have.property('status', 200),
            //    expect(result2).to.eventually.have.property('body.resources').to.have.length(1)
            ])
        })
    })
    describe('delete', function(){
        it('Should return a 404 status if the specified resource does not exist.', function(){
            return Promise.all([
                    request.del(url + '/test')
                ])
                .catch(function(err){ expect(err).to.have.property('status', 404) })
        })
        it('Should return a 204 status and delete the resource whose id is specified.', function(){
            var result1 = request.del(url + '/' + resourceId[0]).promise()
            var result2 = request.del(url + '/' + resourceId[1]).promise()
            var result3 = request.del(url + '/' + resourceId[2]).promise()

            return Promise.all([
                expect(result1).to.eventually.have.property('status', 204),
                expect(result2).to.eventually.have.property('status', 204) ,
                expect(result3).to.eventually.have.property('status', 204)
                ])
        })
    })

/*    after(function(){
        resourceProcess.kill()
        console.log('Movements process ended.')
    })*/
    })

    describe('actions', function(){
        var resourceType = 'actions',
            url = base+'/'+resourceType,
            contentType = 'application/json'

        var resourceId = []

        /*     var resourceProcess
         before(function(){
         resourceProcess = spawn('node', ['../movements/movementsService.js', 'debug=true'])
         resourceProcess.on('error', function(err){
         console.log('Error: Failed to start Movements process!')
         })
         console.log('Movements process started.')
         })*/

        describe('post', function() {
            it('Should return a 400 status if any arguments are missing or malformed.', function () {
                var resource = [{
                    "test":"test",
                    "name":"foo",
                    "description":0,
                    "image":"I see a nose in every place",
                    "organizers":[{"name":"matt"},{"name":"sharothi"}]
                }]

                return Promise.all([
                    request.post(url), // no resources
                    request.post(url).send({resources:resource})  //unexpected fields
                ]).catch(function(err){ expect(err).to.have.property('status', 400) })
            })
            it('Should return a 201 status and add the provided resource(s), but ignore any id fields.', function () {
                var resource = [{
                    name:"i see a nose ",
                    description:"on every face",
                    image:"I see a nose in every place",
                    organizers:[{"name":"matt"},{"name":"sharothi"}]
                }]
                var result = request.post(url).send({resources:resource}).promise()
                var resources = [
                    {
                        "name":"wheel on the bus go",
                        "description":"round and round, round and round",
                        "image":"wheels on the bus go round and round, all around the town",
                        "organizers":[{"name":"matt"},{"name":"sharothi"}]
                    },
                    {
                        "name":"brown bear brown bear",
                        "description":"what do you see",
                        "image":"I see a red bird looking at me",
                        "organizers":[{"name":"matt"},{"name":"sharothi"}]
                    }
                ]
                var results = request.post(url).send({resources:resources}).promise()

                result.then(function(res) {
                    resourceId.push(res.body.resources[0].id)
                })
                results.then(function(res) {
                    resourceId.push(res.body.resources[0].id)
                    resourceId.push(res.body.resources[1].id)
                })

                return Promise.all([
                    expect(result).to.eventually.have.property('status', 201),
                    //expect(result).to.eventually.have.property('body.resources').to.have.length(1),
                    //expect(result).to.eventually.have.property('body.resources[0].name', 'i see a nose'),
                    expect(results).to.eventually.have.property('status', 201),
                    //expect(results).to.eventually.have.property('body.resources').to.have.length(2),
                    //expect(results).to.eventually.have.property('body.resources[1].name', 'brown bear brown bear')
                ])
                //.catch(function(error){console.log(JSON.stringify(error))})

                var tmp2 = {
                    "requestId":"e1a1b79400000",
                    "status":{"code":201,"message":"Created"},
                    "resources":[
                        {
                            "id":"1c3acdbea00000",
                            "name":"i see a nose",
                            "description":"on every face",
                            "image":"I see a nose in every place",
                            "organizers":[{"name":"matt"},{"name":"sharothi"}]
                        }
                    ],
                    "context":"api"}

            })
            it('Should return a 409 status if any of the the provided resource(s) already exist.', function () {
                var resource = [{
                    name:"i see a nose",
                    description:"on every face",
                    image:"I see a nose in every place",
                    organizers:[{"name":"matt"},{"name":"sharothi"}]
                }]

                return Promise.all([
                        request.post(url).send({resources:resource})
                    ])
                    .catch(function(err){ expect(err).to.have.property('status', 409) })
            })
        })
        describe('get', function() {
            it('Should return a 400 status if any arguments are missing or malformed.', function () {
                return Promise.all([
                    request.get(url + '/' + resourceId[0]).query({fields:false})
                ]).catch(function(err){ expect(err).to.have.property('status', 400) })
            })
            it('Should return a 404 status if the resource does not exist.', function () {
                return Promise.all([
                    request.get(url + '/test')
                ]).catch(function(err){ expect(err).to.have.property('status', 404) })
            })
            it('Should return a 200 status along with the resource corresponding to the provided id.', function () {
                var result = request.get(url + '/' + resourceId[0]).promise()

                return Promise.all([
                    expect(result).to.eventually.have.property('status', 200),
                    //    expect(result).to.eventually.have.property('body.resources[0].name', 'i see a nose')
                ])
            })
        })
        describe('put', function() {
            it('Should return a 400 status if any arguments are missing or malformed.', function () {
                var resource = [{
                    "name":"i see a nose",
                    "description":0,
                    "image":"I see a nose in every place",
                    "organizers":[{"name":"matt"},{"name":"sharothi"}]
                }]

                return Promise.all([
                    request.put(url), // no resources
                    request.put(url).send({resources:resource})  //bad field value
                ]).catch(function(err){ expect(err).to.have.property('status', 400) })
            })
            it('Should return a 404 status if any of the resources do not exist.', function () {
                var resource = [{
                    "id": "test",
                    "name":"foo",
                    "organizers":[{"name":"matt"},{"name":"sharothi"}]
                }]

                return Promise.all([
                    request.put(url).send({resources:resource})
                ]).catch(function(err){ expect(err).to.have.property('status', 404) })
            })
            it('Should return a 200 status and modify and return the target resource(s).', function () {
                var resource = [{
                    "id": resourceId[0],
                    "name":"i see a nose",
                    "description":"test",
                    "image":"I see a nose in every place",
                    "organizers":[{"name":"matt"},{"name":"sharothi"}]
                }]
                var response = request.put(url).send({resources:resource}).promise()

                return Promise.all([
                    expect(response).to.eventually.have.property('status', 200),
                    //    expect(response).to.eventually.have.property('body.resources[0].description', 'test')
                ])
            })
        })
        describe('query', function() {
            it('Should return a 204 status if no matching movements are found.', function () {
                var result = request.get(url).query({query:"test"}).promise()

                return Promise.all([
                    expect(result).to.eventually.have.property('status', 204)
                ])
            })
            it('Should return a 200/204 status and ignore malformed options fields and bad query characters', function () {
                var result1 = request.get(url).query({query:"i see:a}nose"}).promise()
                var result2 = request.get(url).query({query:"test", limit:false}).promise()

                return Promise.all([
                    expect(result1).to.eventually.have.property('status', 200),
                    expect(result2).to.eventually.have.property('status', 204)
                ])
            })
            it('Should return a 200 status along with the movements corresponding to the provided query.', function () {
                var result1 = request.get(url).promise()
                var result2 = request.get(url).query({query:"i see a nose"}).promise()

                return Promise.all([
                    expect(result1).to.eventually.have.property('status', 200),
                    //   expect(result1).to.eventually.have.property('body.resources').to.have.length(3),
                    expect(result2).to.eventually.have.property('status', 200),
                    //    expect(result2).to.eventually.have.property('body.resources').to.have.length(1)
                ])
            })
        })
        describe('delete', function(){
            it('Should return a 404 status if the specified resource does not exist.', function(){
                return Promise.all([
                        request.del(url + '/test')
                    ])
                    .catch(function(err){ expect(err).to.have.property('status', 404) })
            })
            it('Should return a 204 status and delete the resource whose id is specified.', function(){
                var result1 = request.del(url + '/' + resourceId[0]).promise()
                var result2 = request.del(url + '/' + resourceId[1]).promise()
                var result3 = request.del(url + '/' + resourceId[2]).promise()

                return Promise.all([
                    expect(result1).to.eventually.have.property('status', 204),
                    expect(result2).to.eventually.have.property('status', 204) ,
                    expect(result3).to.eventually.have.property('status', 204)
                ])
            })
        })

        /*    after(function(){
         resourceProcess.kill()
         console.log('Movements process ended.')
         })*/
    })
})