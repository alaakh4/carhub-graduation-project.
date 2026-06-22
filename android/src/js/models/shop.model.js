/**
 * models/shop.model.js (ContactUs-style)
 * -------------------------------------
 * Uses configuration/ServerCaller (submitRequest) + notify callback.
 *
 * notify(success, dataOrMsg)
 * - success = true  -> dataOrMsg is the DATA (array/object)
 * - success = false -> dataOrMsg is the ERROR message/object
 *
 * NOTE (from App.java):
 * - There is NO public endpoint to list all shops (no GET /api/shops).
 * - Public shop-related endpoint available: GET /api/shops/:id/reviews
 * - Client can add a shop review: POST /api/client/shops/:id/reviews (token required)
 * - Shop dashboard endpoints exist under /api/shop/* (token role=shop required)
 */
define(['jquery', 'knockout', 'configuration/ServerCaller'], function ($, ko, server) {
  class ShopModel {
    constructor() { }

    // =========================
    // AUTH (Shop)
    // =========================
    login(email, password, notify) {
      const body = { email: email, password: password };
      server.submitRequest('/api/shop/login', 'POST', body, {}, (success, msg, res) => {
        if (success) notify(true, res);     // res.msg usually contains token + shop object
        else notify(false, res.msg);
      }, { json: true });
    }

    // =========================
    // PUBLIC (Shop reviews)
    // =========================
    shopsList(notify) {
      server.submitRequest('/api/shops', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }
    getShopById(id, notify) {
      server.submitRequest('/api/shops/' + id, 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }
    reviews(shopId, notify) {
      server.submitRequest('/api/shops/' + shopId + '/reviews', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    // Client: add shop review (requires token header)
    addReview(shopId, rating, comment, notify) {
      const body = { rating: rating, comment: comment };
      server.submitRequest('/api/client/shops/' + shopId + '/reviews', 'POST', body, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { json: true });
    }

    // =========================
    // SHOP Dashboard (token role=shop)
    // =========================

    // List my parts
    listMyParts(notify) {
      server.submitRequest('/api/shop/parts', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    // Add part (shopId comes from token on backend)
    addPart(partBody, notify) {
      // Expected keys: name, slug, price, quantity; optional tags, details
      server.submitRequest('/api/shop/parts', 'POST', partBody || {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { json: true });
    }

    // Update part
    updatePart(partId, partBody, notify) {
      // Expected keys: name, slug, price, quantity; optional tags, details, is_active
      server.submitRequest('/api/shop/parts/' + partId, 'PUT', partBody || {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { json: true });
    }

    // Add image to part (multipart FormData)
    // FormData keys:
    // - image (File) REQUIRED
    // - is_default (number) optional
    // - sort_order (number) optional
    addPartImage(partId, formData, notify) {
      server.submitRequest('/api/shop/parts/' + partId + '/images', 'POST', formData, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { formData: true });
    }

    // Orders: list + update status
    listPartsOrders(notify) {
      server.submitRequest('/api/shop/parts-orders', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    updatePartsOrderStatus(orderId, status, notify) {
      const body = { status: status };
      server.submitRequest('/api/shop/parts-orders/' + orderId + '/status', 'PATCH', body, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { json: true });
    }

    // Help orders: list + update status
    listHelpOrders(notify) {
      server.submitRequest('/api/shop/help-orders', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      });
    }

    updateHelpOrderStatus(orderId, status, notify) {
      const body = { status: status };
      server.submitRequest('/api/shop/help-orders/' + orderId + '/status', 'PATCH', body, {}, (success, msg, res) => {
        if (success) notify(true, res.msg);
        else notify(false, res.msg);
      }, { json: true });
    }

    overviewLoad(notify) {
      // Load orders then parts (simple + reliable)
      this.listPartsOrders((ok1, ordersOrErr) => {
        if (!ok1) return notify(false, ordersOrErr);

        this.listMyParts((ok2, partsOrErr) => {
          if (!ok2) return notify(false, partsOrErr);

          notify(true, { orders: ordersOrErr || [], parts: partsOrErr || [] });
        });
      });
    }
    countLowStock(parts, threshold) {
      threshold = Number(threshold);
      if (isNaN(threshold)) threshold = 5;
      return (parts || []).filter(p => Number(p.quantity || 0) <= threshold).length;
    }
    ordersLoad(notify) {
      this.listPartsOrders((success, dataOrMsg) => {
        if (!success) return notify(false, dataOrMsg);
        notify(true, Array.isArray(dataOrMsg) ? dataOrMsg : []);
      });
    }
    // wrappers
    acceptPartsOrder(orderId, notify) {
      return this.updatePartsOrderStatus(orderId, 1, notify);
    }
    rejectPartsOrder(orderId, notify) {
      return this.updatePartsOrderStatus(orderId, 2, notify);
    }
    completePartsOrder(orderId, notify) {
      return this.updatePartsOrderStatus(orderId, 3, notify);
    }
    // Shop profile/settings
    getMyProfile(notify) {
      server.submitRequest('/api/me', 'GET', {}, {}, (success, msg, res) => {
        if (success) notify(true, res.user || {});
        else notify(false, res.msg);
      });
    }

    updateMyProfile(body, notify) {
      server.submitRequest('/api/shop/me', 'PUT', body || {}, {}, (success, msg, res) => {
        if (success) notify(true, res.shop || res);
        else notify(false, res.msg);
      }, { json: true });
    }

  }

  return new ShopModel();
});
