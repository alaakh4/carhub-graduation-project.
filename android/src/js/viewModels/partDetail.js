define(['knockout', 'jquery', 'accUtils', 'models/part.model', 'models/profile.model', 'stores/cartStore', 'stores/rate', 'ojs/ojdialog', 'ojs/ojbutton', 'ojs/ojinputnumber'], function (ko, $, accUtils, partModel, profileModel, cartStore, rate) {
    function PartDetailsViewModel() {
        var self = this;
        self.selectedPart = {
            id: ko.observable(),
            name: ko.observable(),
            details: ko.observable(),
            price: ko.observable(),
            quantity: ko.observable(),
            rate: ko.observable(),
            created_at: ko.observable(),
            shopName: ko.observable(),
            phone: ko.observable(),
            email: ko.observable(),
            rateCount: ko.observable(),
            brand: ko.observable(),
            shopId: ko.observable()
        };
        self.selectedReviews = ko.observableArray([]);
        self.selectedSimilarParts = ko.observableArray([]);
        self.ratePercent = rate.ratePercent;
        self.rateText = rate.rateText;
        var limitRev = 2;
        self.allRev = ko.observableArray([]);
        self.reviewsData = ko.observable({ 'percent': null, 'counts': null });
        self.pickedImage = ko.observable();
        self.selectedImages = ko.observableArray([]);
        self.newReviewRating = ko.observable(0);
        self.newReviewComment = ko.observable('');
        self.isSubmittingReview = ko.observable(false);
        self.reviewError = ko.observable('');
        self.reviewSuccess = ko.observable('');
        self.loggedIn = ko.observable(false);
        self.canReview = ko.pureComputed(function () {
            return self.loggedIn();
        });
        self.hasSimilarParts = ko.pureComputed(function () {
            return self.selectedSimilarParts().length > 0;
        });
        self.orderQty = ko.observable(1);

        self.maxOrderQty = ko.pureComputed(function () {
            return Math.max(0, Number(self.selectedPart.quantity() || 0));
        });

        self.normalizeQty = function () {
            var max = self.maxOrderQty();
            var v = parseInt(self.orderQty(), 10);

            if (isNaN(v) || v < 1) v = 1;
            if (max > 0 && v > max) v = max;
            self.orderQty(v);
        };

        self.canDecQty = ko.pureComputed(function () {
            return Number(self.orderQty() || 1) > 1;
        });

        self.canIncQty = ko.pureComputed(function () {
            var max = self.maxOrderQty();
            if (max <= 0) return false;
            return Number(self.orderQty() || 1) < max;
        });

        self.decQty = function () {
            if (!self.canDecQty()) return;
            self.orderQty(Number(self.orderQty() || 1) - 1);
        };

        self.incQty = function () {
            if (!self.canIncQty()) return;
            self.orderQty(Number(self.orderQty() || 1) + 1);
        };

        self.selectedPart.quantity.subscribe(function () {
            self.normalizeQty();
        });

        self.decorateSimilarParts = function (parts) {
            return (parts || []).filter(function (part) {
                return Number(part.is_active || 0) === 1;
            }).map(function (part) {
                var meta = [part.brand, part.category].filter(function (item) {
                    return !!String(item || '').trim();
                }).join(' | ');

                return Object.assign({}, part, {
                    displayImage: part.default_img || 'css/images/front.jpeg',
                    displayPrice: Number(part.price || 0).toFixed(2),
                    displayMeta: meta || 'Similar item'
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

        self.loadSimilarParts = function (partId) {
            if (!partId) {
                self.selectedSimilarParts([]);
                return;
            }

            partModel.similar(partId, 4, function (status, res) {
                if (status) self.selectedSimilarParts(self.decorateSimilarParts(res));
                else self.selectedSimilarParts([]);
            });
        };

        self.loadPart = function () {
            const param = router._activeState.params.id;
            const id = param.split("-")[0];
            limitRev = 2;

            partModel.getByIdFull(id, function (status, res) {
                if (!status || !res || !res.data || !res.data.length) return;

                var part = res.data[0];
                var images = (res.images || []).sort(function (a, b) {
                    return (b.is_default - a.is_default) || (a.sort_order - b.sort_order);
                });
                var defaultImageObj = images.find(function (image) {
                    return Number(image.is_default) === 1 || image.is_default === true;
                }) || images[0] || null;
                var reviews = res.reviews || [];
                var reviewsArray = reviews.map(function (review) {
                    return Object.assign({}, review, {
                        formatedDate: rate.formatDate(review.updated_at),
                        safeComment: (review.comment && review.comment.trim()) ? review.comment.trim() : null
                    });
                });

                self.selectedPart.id(part.id);
                self.selectedPart.name(part.name);
                self.selectedPart.price(part.price);
                self.selectedPart.quantity(part.quantity);
                self.orderQty(1);
                self.normalizeQty();
                self.selectedPart.created_at(part.created_at);
                self.selectedPart.details(part.details);
                self.selectedPart.shopName(part.shopname);
                self.selectedPart.phone(part.phone);
                self.selectedPart.email(part.email);
                self.selectedPart.rate(part.rate);
                self.selectedPart.rateCount(part.rate_count);
                self.selectedPart.brand(part.brand);
                self.selectedPart.shopId(part.shop_id);
                self.selectedImages(images);
                self.pickedImage(defaultImageObj ? defaultImageObj.image_url : 'css/images/front.jpeg');
                self.loadSimilarParts(part.id);
                self.reviewsData(rate.eachStarRate(reviews));
                self.allRev(reviewsArray);
                self.selectedReviews(reviewsArray.slice(0, limitRev));

                profileModel.getMe(function (profileStatus, data) {
                    if (profileStatus) {
                        self.loggedIn(true);
                        self.newReviewRating(0);
                        self.newReviewComment('');
                        var clientId = data.user.id;
                        for (const review of reviewsArray) {
                            if (review.client_id == clientId) {
                                self.newReviewRating(review.rating);
                                self.newReviewComment(review.comment);
                            }
                        }
                    } else {
                        self.loggedIn(false);
                    }
                });
            });
        };

        self.loadMoreReviews = function () {
            limitRev += 2;
            self.selectedReviews(self.allRev().slice(0, limitRev));
        };

        self.hasMoreReviews = ko.pureComputed(function () {
            return self.selectedReviews().length < self.allRev().length;
        });

        self.openSpecification = function (_, e) {
            if (e.currentTarget.className.includes("active")) return;
            var specTab = document.getElementById("specifications-tab");
            var revTab = document.getElementById("reviews-tab");
            var specBtn = document.getElementById("specifications-btn");
            var revBtn = document.getElementById("reviews-btn");
            specTab.classList.add("active");
            specBtn.classList.add("active");
            revBtn.classList.remove("active");
            revTab.classList.remove("active");
        };

        self.openReviews = function (_, e) {
            if (e.currentTarget.className.includes("active")) return;
            var specTab = document.getElementById("specifications-tab");
            var revTab = document.getElementById("reviews-tab");
            var specBtn = document.getElementById("specifications-btn");
            var revBtn = document.getElementById("reviews-btn");
            specTab.classList.remove("active");
            specBtn.classList.remove("active");
            revBtn.classList.add("active");
            revTab.classList.add("active");
        };

        self.switchImgs = function (_, e) {
            $(".thumbnail-images").children().removeClass("active");
            var id = e.currentTarget.id;
            $("#" + id).addClass("active");
            self.pickedImage(e.currentTarget.src);
        };

        self.openSimilarPartDetail = function (part) {
            if (!part || !part.id) return;
            router.go({ path: "partDetail/" + part.id });
        };

        self.submitReview = function () {
            self.reviewError('');
            self.reviewSuccess('');

            var partId = self.selectedPart.id();
            var token = localStorage.getItem('token');

            if (!token) {
                self.reviewError('You must login first.');
                return;
            }

            if (!partId) {
                self.reviewError('Part not found.');
                return;
            }

            var rating = Number(self.newReviewRating());
            var comment = (self.newReviewComment() || '').trim() || null;

            if (!rating || rating < 1 || rating > 5) {
                self.reviewError('Please select a rating from 1 to 5.');
                return;
            }

            self.isSubmittingReview(true);

            partModel.addReview(partId, rating, comment, function (success, msg) {
                if (success) {
                    self.reviewSuccess('Thanks! Your review was submitted.');
                    self.newReviewRating(0);
                    self.newReviewComment('');
                    if (typeof self.loadPart === 'function') self.loadPart();
                } else {
                    self.reviewError(msg || 'Failed to submit review.');
                }
                self.isSubmittingReview(false);
            });
        };

        self.addCartBtn = function (_, e) {
            var guestOrUser = document.getElementById("userLoggedIn").style.display;
            if (guestOrUser == "none") {
                var dlg = document.getElementById('guestDialog');
                return dlg.open();
            }

            var id = e.currentTarget.id.split("_")[0];
            var btn = document.getElementById(id + "_btn");
            const originalHTML = btn.innerHTML;
            var cart = cartStore.readCart();
            for (const part of cart) {
                if (part.id == id) {
                    if (part.quantityOrder + self.orderQty() > part.quantity) {
                        btn.innerHTML = '<i class="fas fa-xmark"></i><span> max of stock added!</span>';
                        btn.style.backgroundColor = '#f80808ff';
                        return setTimeout(function () {
                            btn.innerHTML = originalHTML;
                            btn.style.backgroundColor = '';
                        }, 2000);
                    }
                }
            }

            var item = {
                id: self.selectedPart.id(),
                name: self.selectedPart.name(),
                details: self.selectedPart.details(),
                price: self.selectedPart.price(),
                quantity: self.selectedPart.quantity(),
                brand: self.selectedPart.brand(),
                shop_id: self.selectedPart.shopId(),
                shopName: self.selectedPart.shopName(),
                phone: self.selectedPart.phone(),
                email: self.selectedPart.email(),
                rate: self.selectedPart.rate(),
                rate_count: self.selectedPart.rateCount(),
                created_at: self.selectedPart.created_at()
            };

            if (Number(item.quantity || 0) <= 0) {
                btn.innerHTML = '<i class="fas fa-xmark"></i><span> out of stock!</span>';
                btn.style.backgroundColor = '#f80808ff';
                return setTimeout(function () {
                    btn.innerHTML = originalHTML;
                    btn.style.backgroundColor = '';
                }, 2000);
            }

            btn.innerHTML = '<i class="fas fa-check"></i><span> Added Successfully!</span>';
            btn.style.backgroundColor = '#10B981';
            setTimeout(function () {
                btn.innerHTML = originalHTML;
                btn.style.backgroundColor = '';
            }, 2000);

            item.quantityOrder = Number(self.orderQty() || 1);
            cartStore.writeCartItem(item);
        };

        self.addSimilarPartToCart = function (part, event) {
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

            cartStore.writeCartItem({
                id: part.id,
                name: part.name,
                details: part.details,
                price: part.price,
                quantity: part.quantity,
                brand: part.brand,
                shop_id: part.shop_id,
                rate: part.rate,
                rate_count: part.rate_count,
                created_at: part.created_at,
                quantityOrder: 1
            });

            self.flashCartButton(button, '<i class="fas fa-check"></i><span> Added Successfully!</span>', '#10B981');
        };

        self.onGuestOk = function () {
            var dlg = document.getElementById("guestDialog");
            if (dlg && dlg.close) dlg.close();
            document.getElementById("parts").classList.remove("active");
            document.getElementById("login").classList.add("active");
            router.go({ path: "login" });
        };

        self.shopDetail = function () {
            var id = self.selectedPart.shopId();
            router.go({ path: "workShopDetail/" + id });
        };

        self.connected = function () {
            document.title = 'Part Details';
            accUtils.announce('Part details page loaded.', 'polite');
            self.loadPart();
        };

        self.disconnected = function () {

        };
    }

    return new PartDetailsViewModel();
});
