/**
 * models/part.model.js (ContactUs-style)
 * -------------------------------------
 * Uses configuration/ServerCaller (submitRequest) + notify callback.
 *
 * notify(success, dataOrMsg)
 * - success = true  -> dataOrMsg is the DATA (array/object)
 * - success = false -> dataOrMsg is the ERROR message/object
 */
define(['jquery', 'knockout', 'configuration/ServerCaller'], function ($, ko, server) {
  class PartModel {
    constructor() {
      // no classEndpoint because your API routes are /api/...
    }

    // -------------------------
    // Public parts
    // -------------------------
    listPublic(query, notify) {
      if (typeof query === 'function') {
        notify = query;
        query = '';
      }

      var params = {};
      if (query != null && String(query).trim()) params.q = String(query).trim();

      server.submitRequest('/api/parts', 'GET', params, {}, (success, msg, res, textStatus, xhr) => {
        if (success) notify(true, res.msg);         // res.msg is always the list
        else notify(false, res.msg);               // error
      });
    }

    getById(partId, notify) {
      server.submitRequest('/api/parts/' + partId, 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }
    getByIdFull(partId, notify) {
      server.submitRequest('/api/parts/' + partId + "/details", 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    images(partId, notify) {
      server.submitRequest('/api/parts/' + partId + '/images', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    cars(partId, notify) {
      server.submitRequest('/api/parts/' + partId + '/cars', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    similar(partId, limit, notify) {
      server.submitRequest('/api/parts/' + partId + '/similar', 'GET', { limit: limit || 4 }, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    reviews(partId, notify) {
      server.submitRequest('/api/parts/' + partId + '/reviews', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    // Client: add part review (requires token)
    addReview(partId, rating, comment, notify) {
      const body = { rating: rating, comment: comment };
      server.submitRequest('/api/client/parts/' + partId + '/reviews', 'POST', body, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else {console.log(res);notify(false, res.msg);}
      }, { json: true });
    }

    // -------------------------
    // Shop dashboard parts (requires shop token)
    // -------------------------
    listMyShopParts(notify) {
      server.submitRequest('/api/shop/parts', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    addPart(partBody, notify) {
      server.submitRequest('/api/shop/parts', 'POST', partBody || {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { json: true });
    }

    updatePart(partId, partBody, notify) {
      server.submitRequest('/api/shop/parts/' + partId, 'PUT', partBody || {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { json: true });
    }

    // -------------------------
    // Shop part images
    // -------------------------
    addPartImage(partId, file, isDefault, sortOrder, notify) {
      const fd = new FormData();
      fd.append('image', file);
      if (isDefault !== undefined && isDefault !== null) fd.append('is_default', String(isDefault));
      if (sortOrder !== undefined && sortOrder !== null) fd.append('sort_order', String(sortOrder));

      server.submitRequest('/api/shop/parts/' + partId + '/images', 'POST', fd, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { formData: true });
    }

    updatePartImage(partId, imageId, isDefault, sortOrder, notify) {
      const body = { is_default: isDefault, sort_order: sortOrder };
      server.submitRequest('/api/shop/parts/' + partId + '/images/' + imageId, 'PUT', body, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { json: true });
    }

    deletePartImage(partId, imageId, notify) {
      server.submitRequest('/api/shop/parts/' + partId + '/images/' + imageId, 'DELETE', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }
  }

  return new PartModel();
});
