define(['knockout', 'models/shop.model'], function (ko, shopModel) {
  function ShopPartFormViewModel(params) {
    var self = this;

    self.partId = ko.observable(params && params.partId ? Number(params.partId) : null);
    self.formTitle = ko.observable(self.partId() ? 'Edit Part' : 'Add Part');

    self.name = ko.observable('');
    self.slug = ko.observable('');
    self.price = ko.observable('');
    self.quantity = ko.observable('');
    self.brand = ko.observable('');
    self.category = ko.observable('');
    self.tags = ko.observable('');
    self.details = ko.observable('');
    self.is_active = ko.observable('1');

    self.selectedFiles = ko.observableArray([]);
    self.selectedFileNames = ko.observableArray([]);
    self.newImagePreviews = ko.observableArray([]);
    self.existingImages = ko.observableArray([]);
    self.defaultImageIndex = ko.observable(0);
    self.uploadHint = ko.observable('Select images, then choose which one is default.');

    self.back = function () {
      if (params && params.backToParts) params.backToParts();
    };

    self.removeSelectedFile = function (preview) {
      var files = self.selectedFiles().slice();
      var previews = self.newImagePreviews().slice();
      var removedIndex = preview.index;
      var currentDefault = self.defaultImageIndex();

      files.splice(removedIndex, 1);
      previews.splice(removedIndex, 1);

      previews = previews.map(function (p, idx) {
        return {
          index: idx,
          name: p.name,
          url: p.url
        };
      });

      self.selectedFiles(files);
      self.selectedFileNames(files.map(function (f) { return f.name; }));
      self.newImagePreviews(previews);

      if (!previews.length) {
        self.defaultImageIndex(0);
      } else if (removedIndex === currentDefault) {
        self.defaultImageIndex(0);
      } else if (removedIndex < currentDefault) {
        self.defaultImageIndex(currentDefault - 1);
      }
    };

    function readFileInput() {
      var el = document.getElementById('partImagesInput');
      if (!el) return;

      var currentFiles = self.selectedFiles().slice();
      var newFiles = Array.from(el.files || []);
      if (!newFiles.length) return;

      var mergedFiles = currentFiles.concat(newFiles);
      self.selectedFiles(mergedFiles);
      self.selectedFileNames(mergedFiles.map(function (f) { return f.name; }));

      var currentPreviews = self.newImagePreviews().slice();
      var startIndex = currentPreviews.length;

      var extraPreviews = newFiles.map(function (file, idx) {
        return {
          index: startIndex + idx,
          name: file.name,
          url: URL.createObjectURL(file)
        };
      });

      var mergedPreviews = currentPreviews.concat(extraPreviews);
      self.newImagePreviews(mergedPreviews);

      // first selected image becomes default automatically
      if (mergedPreviews.length > 0 && currentPreviews.length === 0) {
        self.defaultImageIndex(0);
      }

      el.value = '';
    }

    self.setDefaultImage = function (preview) {
      self.defaultImageIndex(preview.index);
    };

    function normalizeExistingImages(p) {
      var imgs = Array.isArray(p.images) ? p.images : [];
      return imgs.map(function (img) {
        var raw = img.image_url || img.url || img.path || '';
        var url = raw && raw.indexOf('http') === 0 ? raw : ('http://localhost:4567/' + String(raw || '').replace(/^\/+/, ''));
        return {
          id: img.id || null,
          url: url,
          is_default: Number(img.is_default || 0) === 1
        };
      });
    }

    function loadForEdit() {
      if (!self.partId()) return;

      shopModel.listMyParts(function (success, dataOrMsg) {
        if (!success) return;

        var list = Array.isArray(dataOrMsg) ? dataOrMsg : [];
        var p = list.find(function (x) { return Number(x.id) === Number(self.partId()); });
        if (!p) return;

        self.name(p.name || '');
        self.slug(p.slug || '');
        self.price(p.price != null ? String(p.price) : '');
        self.quantity(p.quantity != null ? String(p.quantity) : '');
        self.brand(p.brand || '');
        self.category(p.category || '');
        self.tags(p.tags || '');
        self.details(p.details || '');
        self.is_active(String(p.is_active != null ? p.is_active : 1));
        self.existingImages(normalizeExistingImages(p));
      });
    }

    function buildPayload() {
      return {
        name: String(self.name() || '').trim(),
        slug: String(self.slug() || '').trim(),
        price: Number(self.price() || 0),
        quantity: Number(self.quantity() || 0),
        brand: (String(self.brand() || '').trim() || null),
        category: (String(self.category() || '').trim() || null),
        tags: (String(self.tags() || '').trim() || null),
        details: (String(self.details() || '').trim() || null)
      };
    }

    function validatePayload(payload) {
      if (!payload.name || !payload.slug || !payload.price || payload.quantity < 0) {
        alert('Please fill: name, slug, price, quantity');
        return false;
      }
      return true;
    }

    function detectCreatedIdBySlug(slug, cb) {
      shopModel.listMyParts(function (success, dataOrMsg) {
        if (!success) {
          alert('Part created, but could not load parts list for image upload.');
          return cb(true, null);
        }

        var list = Array.isArray(dataOrMsg) ? dataOrMsg : [];
        var matches = list.filter(function (x) {
          return String(x.slug || '') === String(slug || '');
        });

        matches.sort(function (a, b) { return Number(b.id) - Number(a.id); });
        var newest = matches[0];

        if (!newest) {
          alert('Part created, but could not detect its id to upload images. Please refresh parts.');
          return cb(true, null);
        }

        self.partId(Number(newest.id));
        self.formTitle('Edit Part');
        cb(true, self.partId());
      });
    }

    function createOrUpdatePart(cb) {
      var payload = buildPayload();
      if (!validatePayload(payload)) return cb(false);

      if (self.partId()) {
        payload.is_active = Number(self.is_active() || 1);

        shopModel.updatePart(self.partId(), payload, function (success, dataOrMsg) {
          if (!success) {
            alert((dataOrMsg && dataOrMsg.msg) || dataOrMsg || 'Save failed');
            return cb(false);
          }
          cb(true, self.partId());
        });
      } else {
        shopModel.addPart(payload, function (success, dataOrMsg) {
          if (!success) {
            alert((dataOrMsg && dataOrMsg.msg) || dataOrMsg || 'Create failed');
            return cb(false);
          }

          detectCreatedIdBySlug(payload.slug, cb);
        });
      }
    }

    function uploadImages(partId, cb) {
      var files = self.selectedFiles();
      if (!partId) return cb(true);
      if (!files || !files.length) return cb(true);

      var i = 0;

      (function next() {
        if (i >= files.length) return cb(true);

        var fd = new FormData();
        fd.append('image', files[i]);

        var isDefault = (i === self.defaultImageIndex()) ? 1 : 0;
        fd.append('is_default', String(isDefault));
        fd.append('sort_order', String(i));

        shopModel.addPartImage(partId, fd, function (success, dataOrMsg) {
          if (!success) {
            alert((dataOrMsg && dataOrMsg.msg) || dataOrMsg || 'Image upload failed');
            return cb(false);
          }
          i++;
          next();
        });
      })();
    }

    self.save = function () {
      createOrUpdatePart(function (ok, id) {
        if (!ok) return;

        uploadImages(id, function (ok2) {
          if (!ok2) return;
          alert('Saved');
          if (params && params.backToParts) params.backToParts();
        });
      });
    };

    self.connected = function () {
      loadForEdit();
      setTimeout(function () {
        var el = document.getElementById('partImagesInput');
        if (el) el.addEventListener('change', readFileInput);
      }, 0);
    };

    self.disconnected = function () { };
  }

  return ShopPartFormViewModel;
});