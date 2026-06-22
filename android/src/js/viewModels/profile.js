/**
 * viewModels/profile.js
 * --------------------
 * Oracle JET/Knockout ViewModel for profile page.
 *
 * Data source:
 * - models/profile.model.js
 *
 * Auth:
 * - Token stored in localStorage key: 'token'
 */

define(['jquery', 'knockout', 'models/profile.model', 'models/orders.model', 'configuration/ServerCaller', 'accUtils'], function ($, ko, profileModel, ordersModel, server, accUtils) {
  function ProfileViewModel() {
    var self = this;
    var serverBase = (server.baseUrl || '').replace(/\/+$/, '');

    // -------------------------
    // Auth
    // -------------------------
    self.token = ko.observable('');
    self.hasToken = ko.pureComputed(function () {
      return !!self.token();
    });

    self.refreshToken = function () {
      try {
        self.token(window.localStorage ? (window.localStorage.getItem('token') || '') : '');
      } catch (e) {
        self.token('');
      }
    };

    // -------------------------
    // UI state
    // -------------------------
    self.activeTab = ko.observable('personal');
    self.isEditing = ko.observable(false);
    self.loading = ko.observable(false);
    self.errorMsg = ko.observable('');
    self.successMsg = ko.observable('');
    self.avatarUploading = ko.observable(false);
    self.orderHistory = ko.observableArray([]);
    self.orderHistoryLoading = ko.observable(false);
    self.orderHistoryLoaded = ko.observable(false);

    // -------------------------
    // Profile data (client)
    // -------------------------
    self.profile = {
      id: ko.observable(null),
      fname: ko.observable(''),
      lname: ko.observable(''),
      email: ko.observable(''),
      phone: ko.observable(''),
      address: ko.observable(''),
      car_type: ko.observable(''),
      city: ko.observable(null),
      avatar_url: ko.observable('')
    };

    self.fullName = ko.pureComputed(function () {
      var fn = (self.profile.fname() || '').trim();
      var ln = (self.profile.lname() || '').trim();
      var full = (fn + ' ' + ln).trim();
      return full || 'My Profile';
    });

    self.avatarSrc = ko.pureComputed(function () {
      if (self.profile.avatar_url()) {
        return serverBase + '/' + String(self.profile.avatar_url()).replace(/^\/+/, '');
      }
      return serverBase + '/carhubfiles/uploads/clients/avatar.png';
    });

    self._backup = null;

    self._snapshot = function () {
      return {
        id: self.profile.id(),
        fname: self.profile.fname(),
        lname: self.profile.lname(),
        email: self.profile.email(),
        phone: self.profile.phone(),
        address: self.profile.address(),
        car_type: self.profile.car_type(),
        city: self.profile.city(),
        avatar_url: self.profile.avatar_url()
      };
    };

    self._restore = function (obj) {
      if (!obj) return;
      self.profile.id(obj.id || null);
      self.profile.fname(obj.fname || '');
      self.profile.lname(obj.lname || '');
      self.profile.email(obj.email || '');
      self.profile.phone(obj.phone || '');
      self.profile.address(obj.address || '');
      self.profile.car_type(obj.car_type || '');
      self.profile.city(obj.city === undefined ? null : obj.city);
      self.profile.avatar_url(obj.avatar_url || '');
    };

    self._applyUser = function (u) {
      if (!u) u = {};
      self.profile.id(u.id || u.client_id || u.user_id || null);
      self.profile.fname(u.fname || u.first_name || '');
      self.profile.lname(u.lname || u.last_name || '');
      self.profile.email(u.email || '');
      self.profile.phone(u.phone || '');
      self.profile.address(u.address || '');
      self.profile.car_type(u.car_type || '');
      self.profile.city(u.city === undefined ? null : u.city);
      self.profile.avatar_url(u.avatar_url);
    };

    self.openAvatarPicker = function () {
      var input = document.getElementById('profileAvatarInput');
      if (input && !self.avatarUploading()) input.click();
    };

    self.onAvatarSelected = function (vm, event) {
      var file = event && event.target && event.target.files ? event.target.files[0] : null;
      if (!file) return;

      self.errorMsg('');
      self.successMsg('');

      if (!String(file.type || '').toLowerCase().startsWith('image/')) {
        self.errorMsg('Please select an image file.');
        if (event.target) event.target.value = '';
        return;
      }

      self.avatarUploading(true);

      profileModel.uploadClientAvatar(file, function (uploadOk, uploadResult) {
        if (!uploadOk || !uploadResult) {
          self.avatarUploading(false);
          self.errorMsg(uploadResult || 'Failed to upload avatar.');
          if (event.target) event.target.value = '';
          return;
        }

        profileModel.updateClientProfile({ avatar_url: uploadResult }, function (updateOk, updated) {
          self.avatarUploading(false);

          if (!updateOk) {
            self.errorMsg(updated || 'Failed to save avatar.');
            if (event.target) event.target.value = '';
            return;
          }

          var userObj = updated && updated.client ? updated.client : updated;
          self._applyUser(userObj);
          if (self._backup) self._backup.avatar_url = self.profile.avatar_url();
          self.successMsg('Profile photo updated successfully');
          if (event.target) event.target.value = '';
        }, 'PATCH');
      });
    };

    // -------------------------
    // Tabs
    // -------------------------
    self.setTab = function (tab, vm, event) {
      if (event && event.preventDefault) event.preventDefault();
      self.activeTab(tab);
      if (tab === 'orders' && !self.orderHistoryLoaded()) {
        self.loadOrderHistory();
      }
    };

    // -------------------------
    // Edit / Save
    // -------------------------
    self.toggleEdit = function () {
      self.errorMsg('');
      self.successMsg('');

      if (!self.isEditing()) {
        self._backup = self._snapshot();
        self.isEditing(true);
      } else {
        self.cancelEdit();
      }
    };

    self.cancelEdit = function () {
      if (self._backup) self._restore(self._backup);
      self._backup = null;
      self.isEditing(false);
    };

    self.loadMe = function () {
      self.refreshToken();
      self.errorMsg('');
      self.successMsg('');

      if (!self.hasToken()) {
        self.errorMsg('You are not logged in. Please login first.');
        return;
      }

      self.loading(true);
      profileModel.getMe(function (ok, payload,status) {
        self.loading(false);
        if (!ok) {
          if(status == 401) {
            localStorage.removeItem("role")
            localStorage.removeItem("token")}
          return router.go({path:"login"})
        }

        // payload could be: {role, user} or directly the user/client object
        var userObj = payload && payload.user ? payload.user : payload;
        self._applyUser(userObj);
      });
    };

    self.formatOrderDate = function (value) {
      if (!value) return 'Completed order';

      var dt = new Date(value);
      if (isNaN(dt.getTime())) return String(value);

      return dt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    self.loadOrderHistory = function () {
      self.refreshToken();

      if (!self.hasToken()) {
        self.orderHistory([]);
        self.orderHistoryLoaded(true);
        return;
      }

      self.orderHistoryLoading(true);

      ordersModel.listOrderHistory(function (ok, data, status) {
        self.orderHistoryLoading(false);
        self.orderHistoryLoaded(true);

        if (!ok) {
          if (status === 401 || status === 403) {
            localStorage.removeItem("role");
            localStorage.removeItem("token");
            return router.go({ path: "login" });
          }

          self.orderHistory([]);
          return;
        }

        var list = Array.isArray(data) ? data : [];
        list = list.map(function (order) {
          var totalPrice = Number(order.total_price || 0);
          var totalQuantity = Number(order.total_quantity || 0);
          var itemsCount = Number(order.items_count || 0);
          var previewImage = order.preview_image
            ? serverBase + order.preview_image
            : 'css/images/front.jpeg';

          return Object.assign({}, order, {
            imageSrc: previewImage,
            createdAtLabel: self.formatOrderDate(order.created_at),
            totalPriceLabel: totalPrice.toFixed(2) + ' EGP',
            totalQuantityLabel: 'Qty ' + totalQuantity,
            itemsCountLabel: itemsCount + (itemsCount === 1 ? ' item' : ' items'),
            summaryText: order.preview_items || 'Completed order items',
            statusClass: 'status-delivered',
            statusLabel: 'Completed'
          });
        });

        self.orderHistory(list);
      });
    };

    self.saveProfile = function (form, event) {
      if (event && event.preventDefault) event.preventDefault();

      self.refreshToken();
      self.errorMsg('');
      self.successMsg('');

      if (!self.hasToken()) {
        self.errorMsg('You are not logged in. Please login first.');
        return false;
      }

      var body = {
        fname: (self.profile.fname() || '').trim(),
        lname: (self.profile.lname() || '').trim(),
        phone: (self.profile.phone() || '').trim(),
        address: (self.profile.address() || '').trim(),
        car_type: (self.profile.car_type() || '').trim(),
        avatar_url: (self.profile.avatar_url() || '').trim()
      };

      // city: allow null
      if (self.profile.city() === '' || self.profile.city() === undefined) body.city = null;
      else body.city = self.profile.city();

      self.loading(true);
      profileModel.updateClientProfile(body, function (ok, updated) {
        self.loading(false);

        if (!ok) {
          self.errorMsg(updated || 'Failed to update profile');
          return;
        }

        // updated could be: {client: {...}} or directly object
        var u = updated && updated.client ? updated.client : updated;
        self._applyUser(u);
        self.isEditing(false);
        self._backup = null;
        self.successMsg('Profile updated successfully');
      }, 'PUT');

      return false;
    };

    // -------------------------
    // JET lifecycle
    // -------------------------
    self.connected = function () {
      document.title = 'Profile';
      accUtils.announce('Profile page loaded.', 'polite');
      self.loadMe();
      self.loadOrderHistory();
    };

    self.disconnected = function () {
      // no-op
    };
  }

  return new ProfileViewModel();
});
