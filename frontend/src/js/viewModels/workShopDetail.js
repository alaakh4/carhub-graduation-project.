define(['knockout', 'jquery', 'accUtils', 'models/shop.model', 'models/profile.model', 'stores/cartStore', 'stores/rate', 'ojs/ojdialog', 'ojs/ojbutton'], function (ko, $, accUtils, shopModel, profileModel, cartStore, rate) {
  function PartDetailsViewModel() {
    var self = this;
    self.selectedShop = {
      id: ko.observable(),
      name: ko.observable(),
      description: ko.observable(),
      services: ko.observable(),
      address: ko.observable(),
      city: ko.observable(),
      phone: ko.observable(),
      email: ko.observable(),
      photoUrl: ko.observable(),
      rate: ko.observable(),
      rateCount: ko.observable(),
      isActive: ko.observable(),
    };
    self.selectedReviews = ko.observableArray([])
    self.ratePercent = rate.ratePercent;
    self.rateText = rate.rateText;
    var limitRev = 2;
    self.allRev = ko.observableArray([]);
    self.reviewsData = ko.observable({ 'percent': null, 'counts': null });
    self.newReviewRating = ko.observable(0);
    self.newReviewComment = ko.observable('');
    self.isSubmittingReview = ko.observable(false);
    self.reviewError = ko.observable('');
    self.reviewSuccess = ko.observable('');
    self.loggedIn = ko.observable(false);
    self.selectedShopParts = ko.observableArray([]);
    self.canReview = ko.pureComputed(function () {
      return self.loggedIn();
    });
    self.hasShopParts = ko.pureComputed(function () {
      return self.selectedShopParts().length > 0;
    });
    self.decorateShopParts = function (parts) {
      return (parts || []).filter(function (part) {
        return Number(part.is_active || 0) === 1;
      }).map(function (part) {
        var meta = [part.brand, part.category].filter(function (item) {
          return !!String(item || '').trim();
        }).join(' | ');

        return Object.assign({}, part, {
          displayImage: part.default_img || 'css/images/front.jpeg',
          displayPrice: Number(part.price || 0).toFixed(2),
          displayMeta: meta || 'Available from this workshop'
        });
      });
    };
    self.flashCartButton = function (button, html, color) {
      if (!button) return;
      var originalHTML = button.getAttribute('data-original-html') || button.innerHTML;
      button.setAttribute('data-original-html', originalHTML);
      button.innerHTML = html;
      button.style.backgroundColor = color;

      setTimeout(function () {
        button.innerHTML = originalHTML;
        button.style.backgroundColor = '';
      }, 2000);
    };
    self.loadShop = () => {
      const param = router._activeState.params.id;
      const id = param.split("-")[0];
      shopModel.getShopById(id, (status, res) => {
        if (status) {
          var shop = res.shopData[0];
          var city = res.shopCity;
          var reviews = res.reviews;
          var shopParts = res.shopParts || [];
          self.selectedShop.id(shop.id)
          self.selectedShop.name(shop.name)
          self.selectedShop.services(shop.services)
          self.selectedShop.city(city)
          self.selectedShop.address(shop.address)
          self.selectedShop.description(shop.description)
          self.selectedShop.phone(shop.phone)
          self.selectedShop.email(shop.email)
          self.selectedShop.rate(shop.rate)
          self.selectedShop.rateCount(shop.rate_count)
          self.selectedShop.photoUrl(shop.photo_url);
          self.selectedShopParts(self.decorateShopParts(shopParts));
          if (shop.is_active == 1) self.selectedShop.isActive(true)
          else self.selectedShop.isActive(false)

          self.reviewsData(rate.eachStarRate(reviews))
          var reviewsArray = (reviews || []).map(r => ({
            ...r,
            formatedDate: rate.formatDate(r.updated_at),
            safeComment: (r.comment && r.comment.trim()) ? r.comment.trim() : null
          }))
          self.allRev(reviewsArray)
          self.selectedReviews(reviewsArray.slice(0, limitRev));

          profileModel.getMe((status, data) => {
            if (status) {
              self.loggedIn(true);
              var clientId = data.user.id;
              for (const r of reviewsArray) {
                if (r.client_id == clientId) {
                  self.newReviewRating(r.rating);
                  self.newReviewComment(r.comment)
                }
              }
            } else {
              self.loggedIn(false);
            }
          })
        }
      })
    }
    // load more button handler
    self.loadMoreReviews = function () {
      limitRev += 2;
      self.selectedReviews(self.allRev().slice(0, limitRev))
    };

    // show/hide button
    self.hasMoreReviews = ko.pureComputed(function () {
      return self.selectedReviews().length < self.allRev().length;
    });
    self.openSpecification = (_, e) => {
      if (e.currentTarget.className.includes("active")) return;
      var specTab = document.getElementById("specifications-tab");
      var revTab = document.getElementById("reviews-tab");
      var specBtn = document.getElementById("specifications-btn");
      var revBtn = document.getElementById("reviews-btn");
      specTab.classList.add("active");
      specBtn.classList.add("active");
      revBtn.classList.remove("active");
      revTab.classList.remove("active");
    }
    self.openReviews = (_, e) => {
      if (e.currentTarget.className.includes("active")) return;
      var specTab = document.getElementById("specifications-tab");
      var revTab = document.getElementById("reviews-tab");
      var specBtn = document.getElementById("specifications-btn");
      var revBtn = document.getElementById("reviews-btn");
      specTab.classList.remove("active");
      specBtn.classList.remove("active");
      revBtn.classList.add("active");
      revTab.classList.add("active");
    }

    self.submitReview = function () {
      self.reviewError('');
      self.reviewSuccess('');

      var shopId = self.selectedShop.id();
      var token = localStorage.getItem('token');

      if (!token) {
        self.reviewError('You must login first.');
        return;
      }

      if (!shopId) {
        self.reviewError('Shop not found.');
        return;
      }

      var rating = Number(self.newReviewRating());
      var comment = (self.newReviewComment() || '').trim() || null;

      if (!rating || rating < 1 || rating > 5) {
        self.reviewError('Please select a rating from 1 to 5.');
        return;
      }

      self.isSubmittingReview(true);

      // ✅ Use shopModel.addReview instead of $.ajax
      shopModel.addReview(shopId, rating, comment, function (success, msg) {
        if (success) {
          self.reviewSuccess('Thanks! Your review was submitted.');
          self.newReviewRating(0);
          self.newReviewComment('');
          if (typeof self.loadShop === 'function') self.loadShop();
        } else {
          self.reviewError(msg || 'Failed to submit review.');
        }
        self.isSubmittingReview(false);
      });
    };
    self.requestService = (_,e) => {
      var id = self.selectedShop.id();
      window.location.href = "request-service?shopId=" + id
    }
    self.scrollToShopParts = function () {
      var section = document.getElementById('shop-parts-section');
      if (section && section.scrollIntoView) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    self.openPartDetail = function (part) {
      if (!part || !part.id) return;
      window.location.href = "partDetail/" + part.id;
    };
    self.addRelatedPartToCart = function (part, event) {
      if (event && event.preventDefault) event.preventDefault();
      if (event && event.stopPropagation) event.stopPropagation();

      var guestOrUser = document.getElementById("userLoggedIn").style.display;
      if (guestOrUser == "none") {
        var dlg = document.getElementById('guestDialog');
        return dlg.open();
      }

      if (!part || !part.id) return;

      var button = event && event.currentTarget ? event.currentTarget : null;
      var cart = cartStore.readCart();

      for (const cartPart of cart) {
        if (Number(cartPart.id) === Number(part.id) && Number(cartPart.quantityOrder || 0) + 1 > Number(part.quantity || 0)) {
          self.flashCartButton(button, '<i class="fas fa-xmark"></i><span> max of stock added!</span>', '#f80808ff');
          return;
        }
      }

      if (Number(part.quantity || 0) <= 0) {
        self.flashCartButton(button, '<i class="fas fa-xmark"></i><span> out of stock!</span>', '#f80808ff');
        return;
      }

      var item = {
        id: part.id,
        name: part.name,
        details: part.details,
        price: part.price,
        quantity: part.quantity,
        brand: part.brand,
        shop_id: part.shop_id,
        shopName: self.selectedShop.name(),
        phone: self.selectedShop.phone(),
        email: self.selectedShop.email(),
        rate: part.rate,
        rate_count: part.rate_count,
        created_at: part.created_at,
        quantityOrder: 1
      };

      cartStore.writeCartItem(item);
      self.flashCartButton(button, '<i class="fas fa-check"></i><span> Added Successfully!</span>', '#10B981');
    };
    self.onGuestOk = function () {
      var dlg = document.getElementById('guestDialog');
      if (dlg && dlg.close) dlg.close();
      document.getElementById("workshops").classList.remove("active");
      document.getElementById("login").classList.add("active");
      router.go({ path: "login" });
    }
    self.connected = function () {
      document.title = 'Workshop Details';
      accUtils.announce('Workshop details page loaded.', 'polite');
      self.loadShop();
    };

    self.disconnected = function () {

    };
  }

  return new PartDetailsViewModel();
});
