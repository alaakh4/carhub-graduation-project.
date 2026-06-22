/**
 * viewModels/register.js
 * ----------------------
 * Register ViewModel.
 *
 * Goals (mobile client app):
 * - Client-only registration
 * - User uploads image (no manual URL input)
 * - After successful register, always redirect to login
 */

define(['knockout', 'models/auth.model', 'models/city.model', 'configuration/AppConfig', 'ojs/ojarraydataprovider',
  'accUtils', 'ojs/ojselectsingle', 'ojs/ojselectcombobox', 'ojs/ojdialog'], function (ko, authModel, cityModel, appConfig, ArrayDataProvider, accUtils) {
    function RegisterViewModel() {
      var self = this;


      self.role = ko.observable('client');
      self.isClient = ko.pureComputed(function () { return self.role() === 'client'; });
      self.isShop = ko.pureComputed(function () { return self.role() === 'shop'; });

      // -------------------------
      // Shared fields
      // -------------------------
      self.email = ko.observable('');
      self.password = ko.observable('');
      self.selectedCities = ko.observableArray([]);
      self.selectedCitiesDP = new ArrayDataProvider(self.selectedCities, {
        keyAttributes: 'value'
      })
      // -------------------------
      // Client fields (clients table)
      // -------------------------
      self.fname = ko.observable('');
      self.lname = ko.observable('');
      self.phone = ko.observable('');
      self.clientAddress = ko.observable('');
      self.clientCity = ko.observable('');

      // Client avatar upload (optional)
      self.clientAvatarFile = ko.observable(null);
      self.clientAvatarPreview = ko.observable('');

      // -------------------------
      // Shop fields (shops table)
      // -------------------------
      self.shopName = ko.observable('');
      self.shopPhone = ko.observable('');
      self.shopAddress = ko.observable('');
      self.shopCity = ko.observable('');
      self.description = ko.observable('');
      self.selectedServices = ko.observableArray([]);
      self.allServices = [{ "label": "Oil Change", "value": "Oil Change" }, { "label": "Tire Service", "value": "Tire Service" },
      { "label": "Engine Repair", "value": "Engine Repair" }, { "label": "Body Work", "value": "Body Work" }
      ]
      self.allServicesDP = new ArrayDataProvider(self.allServices, {
        keyAttributes: 'value'
      })
      // Shop photo upload (required)
      self.shopPhotoFile = ko.observable(null);
      self.shopPhotoPreview = ko.observable('');

      // -------------------------
      // UI state
      // -------------------------
      self.loading = ko.observable(false);
      self.errorMsg = ko.observable('');
      self.successMsg = ko.observable('');
      /** Clear previous messages (keeps the UI clean between attempts). */
      self.clearMessages = function () {
        self.errorMsg('');
        self.successMsg('');
      };

      // -------------------------
      // Helpers
      // -------------------------

      /**
       * Convert <input type="file"> selection into preview image.
       * Why: show user the image they selected before submit.
       */
      self._setImagePreview = function (file, previewObs) {
        if (!file) {
          previewObs('');
          return;
        }
        try {
          var reader = new FileReader();
          reader.onload = function (e) { previewObs((e && e.target && e.target.result) ? e.target.result : ''); };
          reader.onerror = function () { previewObs(''); };
          reader.readAsDataURL(file);
        } catch (e) {
          previewObs('');
        }
      };

      /**
       * Client avatar file input handler.
       * Why: store file + preview.
       */
      self.onClientAvatarChange = function (vm, event) {
        var file = event && event.target && event.target.files ? event.target.files[0] : null;
        self.clientAvatarFile(file || null);
        self._setImagePreview(file, self.clientAvatarPreview);
      };

      /**
       * Shop photo file input handler.
       * Why: store file + preview.
       */
      self.onShopPhotoChange = function (vm, event) {
        var file = event && event.target && event.target.files ? event.target.files[0] : null;
        self.shopPhotoFile(file || null);
        self._setImagePreview(file, self.shopPhotoPreview);
      };

      /**
       * Convert city input to int or null.
       * Why: your DB column is int(11) but KO input value may be string.
       */
      self._parseCity = function (v) {
        if (v === null || v === undefined) return null;
        var s = String(v).trim();
        if (!s) return null;
        var n = parseInt(s, 10);
        return isNaN(n) ? null : n;
      };

      /**
       * Upload image to backend.
       * Endpoint: POST <API>/api/upload/image
       * Why: user should NOT enter image URLs manually; we store the returned URL in DB.
       */
      self._uploadImage = function (file, folder) {
        return new Promise(function (resolve, reject) {
          try {
            var fd = new FormData();
            fd.append('image', file);
            fd.append('folder', folder);

            fetch(appConfig.absoluteUrl('/api/upload/image'), {
              method: 'POST',
              body: fd
            })
              .then(function (resp) {
                return resp.json().then(function (json) {
                  return { status: resp.status, json: json };
                });
              })
              .then(function (out) {
                var j = out.json || {};
                if (out.status >= 200 && out.status < 300 && j.success !== false) {
                  resolve(j.image_url || '');
                } else {
                  reject(j.msg || j.error || 'Image upload failed');
                }
              })
              .catch(function (err) {
                reject((err && err.message) ? err.message : 'Image upload failed');
              });
          } catch (e) {
            reject('Image upload failed');
          }
        });
      };

      /**
       * Build register payload for current role.
       * Why: shop and client have different columns.
       */
      self._buildPayload = function () {
        var email = (self.email() || '').trim();
        var password = (self.password() || '').trim();

        if (self.isClient()) {
          return {
            email: email,
            password: password,
            fname: (self.fname() || '').trim(),
            lname: (self.lname() || '').trim(),
            phone: (self.phone() || '').trim(),
            address: (self.clientAddress() || '').trim(),
            city: self._parseCity(self.clientCity())
            // avatar_url will be added ONLY if user uploads a file
          };
        }

        // shop
        var servicesString = self.selectedServices().map((v) => String(v).trim()).filter(Boolean).join(",")
        return {
          email: email,
          password: password,
          name: (self.shopName() || '').trim(),
          phone: (self.shopPhone() || '').trim(),
          address: (self.shopAddress() || '').trim(),
          description: (self.description() || '').trim(),
          services: (servicesString || '').trim(),
          city: self._parseCity(self.shopCity())
          // photo_url will be added after upload (required)
        };
      };

      /**
       * Validate required fields before calling API.
       * Why: more professional UX (fast feedback, fewer bad API calls).
       */
      self._validate = function (payload) {
        if (!payload.email || !payload.password) return 'Email and password are required.';

        if (self.isClient()) {
          if (!payload.fname || !payload.lname) return 'First name and last name are required.';
          if (!payload.phone) return 'Phone is required.';
          if (!payload.address) return 'Address is required.';
          // avatar is optional
          return '';
        }

        // shop
        if (!payload.name) return 'Workshop name is required.';
        if (!payload.phone) return 'Phone is required.';
        if (!payload.address) return 'Address is required.';
        if (!self.shopPhotoFile()) return 'Workshop photo is required (upload).';
        return '';
      };

      /**
       * Register submit handler.
       * Flow:
       * 1) Validate
       * 2) Upload image (shop required, client optional)
       * 3) Call register endpoint
       * 4) Show success message and redirect to login
       */

      self.refreshCities = function () {
        cityModel.listAll((success, res) => {
          var cities = []
          res.forEach((city) => {
            console.log(city)
            cities.push({ "value": city.id, "label": city.name })
          })
          self.selectedCities(cities)
        })
      }
      self.refreshCities();
      self.register = function (form, event) {
        if (event && event.preventDefault) event.preventDefault();
        self.clearMessages();
        var role = self.role();
        var payload = self._buildPayload();
        var err = self._validate(payload);
        if (err) {
          self.errorMsg(err);
          return false;
        }
        self.loading(true);

        // Decide which upload we need
        var uploadPromise;
        if (self.isShop()) {
          uploadPromise = self._uploadImage(self.shopPhotoFile(), 'shops')
            .then(function (url) {
              payload.photo_url = url; // DB column for shop
              return payload;
            });
        } else if (self.clientAvatarFile()) {
          uploadPromise = self._uploadImage(self.clientAvatarFile(), 'clients')
            .then(function (url) {
              payload.avatar_url = url; // DB column for client
              return payload;
            });
        } else {
          uploadPromise = Promise.resolve(payload);
        }

        uploadPromise
          .then(function (finalPayload) {
            authModel.register(role, finalPayload, function (ok, res) {
              self.loading(false);

              if (!ok) {
                self.errorMsg(res || 'Register failed');
                return;
              }

              var msg = 'Account created successfully. Please login.';
              self.successMsg(msg);
              setTimeout(function () {
                router.go({ path: 'login' });
              }, 500);
            });
          })
          .catch(function (uploadErr) {
            self.loading(false);
            self.errorMsg(uploadErr || 'Image upload failed');
          });

        return false;
      };

      self.openShopApproveDialog = function () {
        var dlg = document.getElementById('shopApprovalDialog');
        dlg.open();
      };
      // Helper: close dialog and go home
      self.onShopApprovalOk = function () {
        var dlg = document.getElementById('shopApprovalDialog');
        if (dlg && dlg.close) dlg.close();
        document.getElementById("register").classList.remove("active");
        document.getElementById("home").classList.add("active");
        setTimeout(() => { router.go({ path: "home" }) }, 400);
      };

      self.connected = function () {
        self.role('client');
        document.title = 'Register | CarHub Mobile';
        accUtils.announce('Register page loaded.', 'polite');
        var passwordInput = document.querySelector('.auth-form input[type="password"]');
        if (passwordInput) passwordInput.setAttribute('placeholder', 'Create a password');
      };

      self.disconnected = function () { };
    }

    return new RegisterViewModel();
  });
