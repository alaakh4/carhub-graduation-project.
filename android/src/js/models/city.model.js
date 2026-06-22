define(['jquery', 'knockout', 'configuration/ServerCaller'], function ($, ko, server) {
    class PartModel {
        constructor() {
            // no classEndpoint because your API routes are /api/...
        }
        listAll(notify){
            server.submitRequest('/api/cities','GET',{},{},(success,msg,res)=>{
                if(success) return notify(true,res.msg)
                else return notify(false,res.msg)
            })
        }
    }
    return new PartModel
})