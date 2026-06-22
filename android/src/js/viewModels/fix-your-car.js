define([
    'knockout',
    'models/ai.model',
    'models/shop.model',
    'stores/appState',
    'stores/rate',
    'stores/serviceMatcher'
], function (ko, aiModel, shopModel, appState, rate, serviceMatcher) {
    function FixYourCarViewModel() {
        var self = this;

        self.ratePercent = rate.ratePercent;
        self.rateText = rate.rateText;

        self.complaintText = ko.observable('');
        self.aiLoading = ko.observable(false);
        self.isLoadingShops = ko.observable(false);
        self.hasAnalyzed = ko.observable(false);

        self.predictedClass = ko.observable('');
        self.predictedLabel = ko.observable('');
        self.topConfidenceText = ko.observable('');
        self.errorMessage = ko.observable('');

        self.allShops = ko.observableArray([]);
        self.recommendedShops = ko.observableArray([]);
        self.confidenceEntries = ko.observableArray([]);

        self.hasPrediction = ko.pureComputed(function () {
            return !!self.predictedClass();
        });

        self.predictedKeywords = ko.pureComputed(function () {
            return serviceMatcher.getServiceKeywords(self.predictedClass());
        });

        self.resultDescription = ko.pureComputed(function () {
            if (!self.hasPrediction()) return '';

            return 'We matched workshops whose listed services align with ' + self.predictedLabel().toLowerCase() + '.';
        });

        self.resetResults = function () {
            self.predictedClass('');
            self.predictedLabel('');
            self.topConfidenceText('');
            self.errorMessage('');
            self.hasAnalyzed(false);
            self.confidenceEntries([]);
            self.recommendedShops([]);
        };

        self.decorateShops = function (shops, predictedClass) {
            return (Array.isArray(shops) ? shops : []).map(function (shop) {
                var matchedKeywords = serviceMatcher.getMatchingKeywords(shop, predictedClass).slice(0, 3);
                var serviceTags = serviceMatcher.splitServices(shop.services).slice(0, 4);

                return Object.assign({}, shop, {
                    matchedKeywords: matchedKeywords,
                    serviceTags: serviceTags,
                    displayRating: Number(shop.rate || 0).toFixed(1),
                    displayPhotoUrl: shop.photo_url || 'css/images/front.jpeg'
                });
            }).sort(function (a, b) {
                return (Number(b.rate) || 0) - (Number(a.rate) || 0) ||
                    (Number(b.rate_count) || 0) - (Number(a.rate_count) || 0);
            });
        };

        self.buildConfidenceEntries = function (predictedClass, scores) {
            return Object.keys(scores || {}).map(function (key) {
                var value = Number(scores[key]) || 0;
                return {
                    key: key,
                    label: serviceMatcher.getServiceLabel(key),
                    value: value,
                    percentText: Math.round(value * 100) + '%',
                    barWidth: Math.max(6, Math.round(value * 100)) + '%',
                    isWinner: key === predictedClass
                };
            }).sort(function (a, b) {
                return b.value - a.value;
            });
        };

        self.setPrediction = function (result) {
            var predictedClass = result.predicted_class || '';
            var predictedLabel = result.predicted_label || serviceMatcher.getServiceLabel(predictedClass);
            var confidenceScores = result.confidence_scores || {};
            var topScore = confidenceScores[predictedClass];

            self.predictedClass(predictedClass);
            self.predictedLabel(predictedLabel);
            self.confidenceEntries(self.buildConfidenceEntries(predictedClass, confidenceScores));
            self.topConfidenceText(topScore !== undefined && topScore !== null
                ? Math.round(Number(topScore) * 100) + '%'
                : '');
        };

        self.loadAllShops = function (notify) {
            var cachedShops = appState.shops();
            if (cachedShops && cachedShops.length) {
                self.allShops(cachedShops);
                if (typeof notify === 'function') notify(true, cachedShops);
                return;
            }

            self.isLoadingShops(true);

            shopModel.shopsList(function (ok, data) {
                self.isLoadingShops(false);

                var shops = Array.isArray(data) ? data : [];
                self.allShops(shops);

                if (ok) {
                    appState.setShops(shops);
                }

                if (typeof notify === 'function') notify(ok, shops);
            });
        };

        self.filterShopsByPrediction = function (predictedClass) {
            var baseList = self.allShops().length ? self.allShops() : (appState.shops() || []);
            var filtered = serviceMatcher.filterShops(baseList, predictedClass);
            self.recommendedShops(self.decorateShops(filtered, predictedClass));
        };

        self.analyzeProblem = function () {
            var text = (self.complaintText() || '').trim();

            self.resetResults();

            if (!text) {
                self.errorMessage('Please describe the car problem first.');
                return;
            }

            self.aiLoading(true);

            aiModel.predictService(text, function (ok, resultOrMessage) {
                self.aiLoading(false);
                self.hasAnalyzed(true);

                if (!ok) {
                    self.errorMessage(resultOrMessage || 'Failed to analyze the problem.');
                    return;
                }

                self.setPrediction(resultOrMessage);

                if (self.allShops().length || (appState.shops() || []).length) {
                    self.filterShopsByPrediction(self.predictedClass());
                    return;
                }

                self.loadAllShops(function (shopsLoaded) {
                    if (!shopsLoaded) {
                        self.errorMessage('Prediction created, but workshops could not be loaded right now.');
                        return;
                    }

                    self.filterShopsByPrediction(self.predictedClass());
                });
            });
        };

        self.viewShopProfile = function (shop) {
            if (!shop || !shop.id) return;
            router.go({ path: 'workShopDetail/' + shop.id });
        };

        self.requestServiceFromShop = function (shop) {
            if (!shop || !shop.id) return;
            window.location.href = window.buildCarHubAppUrl('request-service', {
                shopId: shop.id,
                details: self.complaintText(),
                predictedClass: self.predictedClass(),
                predictedLabel: self.predictedLabel()
            });
        };

        self.browseAllWorkshops = function () {
            if (self.predictedClass()) {
                window.location.href = window.buildCarHubAppUrl('workshops', {
                    services: self.predictedClass()
                });
                return;
            }

            router.go({ path: 'workshops' });
        };

        self.connected = function () {
            document.title = 'Fix Your Car | CarHub';
            self.loadAllShops();
        };
    }

    return FixYourCarViewModel;
});
