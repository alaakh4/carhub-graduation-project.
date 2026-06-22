define(['configuration/ServerCaller'], function (server) {
  function _extractError(res, fallbackMsg) {
    if (!res) return fallbackMsg || 'Request failed';
    return res.msg || res.error || fallbackMsg || 'Request failed';
  }

  class HelpOrderModel {
    create(payload, notify) {
      server.submitRequest('/api/client/help-orders', 'POST', payload || {}, {}, function (success, msg, res) {
        if (!success) return notify(false, _extractError(res, msg));
        if (res && res.success === false) return notify(false, _extractError(res, 'Failed to create help order'));
        return notify(true, res);
      }, { json: true });
    }
  }

  return new HelpOrderModel();
});