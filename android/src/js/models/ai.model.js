define(['configuration/ServerCaller'], function (server) {
  function _extractError(res, fallbackMsg) {
    if (!res) return fallbackMsg || 'Prediction failed';
    if (typeof res === 'string') return res;
    return res.error || res.msg || fallbackMsg || 'Prediction failed';
  }

  class AiModel {
    predictService(complaintText, notify) {
      var payload = {
        text: complaintText || '',
        complaint: complaintText || ''
      };

      server.submitRequest('/api/ai/predict-service', 'POST', payload, {}, function (success, msg, res) {
        if (!success) return notify(false, _extractError(res, msg));

        var body = msg || {};
        var result = body.result || body;

        if (!result || !result.predicted_class) {
          return notify(false, 'No prediction was returned.');
        }

        return notify(true, result);
      }, { json: true });
    }
  }

  return new AiModel();
});
