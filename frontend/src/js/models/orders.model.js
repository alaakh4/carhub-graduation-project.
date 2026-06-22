define(['jquery', 'knockout', 'configuration/ServerCaller'], function ($, ko, server) {
    class PartModel {
        constructor() {
            // no classEndpoint because your API routes are /api/...
        }
        _auth() {
            var token = localStorage.getItem("token");
            if (!token) return window.location.href = "?ojr=login"
            return { token: token }
        }

        listByClient(notify) {
            server.submitRequest('/api/client/parts-orders', 'GET', {}, this._auth(), (success, msg, res) => {
                if (success) return notify(true, res)
                else return notify(false, res.msg)
            })
        }
        placeOrder(payload, notify) {
            server.submitRequest('/api/client/parts-orders', 'POST', payload, this._auth(), (success, msg, res) => {
                if (success) return notify(true)
                else return notify(false, res.msg)
            })
        }
        listCurrentOrders(callback) {
            server.submitRequest('/api/client/parts-orders/current', 'GET', null, this._auth(), (success, msg, res, status) => {
                if(success){
                    callback(true, msg);
                }else{
                    callback(false, res, status);
                }
            })
        }
        listOrderHistory(callback) {
            server.submitRequest('/api/client/parts-orders/history', 'GET', null, this._auth(), (success, msg, res, status) => {
                if (success) {
                    callback(true, msg);
                } else {
                    callback(false, res, status);
                }
            })
        }
    }
    return new PartModel
})
