define([], function () {
  function lower(value) {
    return String(value || '').trim().toLowerCase();
  }

  function splitServices(value) {
    return String(value || '')
      .split(',')
      .map(function (item) {
        return String(item || '').trim();
      })
      .filter(function (item) {
        return !!item;
      });
  }

  function getServiceKeywords(serviceValue) {
    switch (lower(serviceValue)) {
      case 'engine_service':
        return ['engine repair', 'engine', 'diagnostics', 'cooling', 'oil change', 'belts'];

      case 'electrical_battery_service':
        return ['electrical', 'battery', 'diagnostics'];

      case 'brake_service':
        return ['brake service', 'brakes', 'brake'];

      case 'tire_wheel_service':
        return ['tire service', 'tires', 'tire', 'wheel', 'wheels', 'suspension', 'alignment'];

      case 'ac_service':
        return ['ac service', 'ac', 'cooling', 'air conditioning'];

      case 'body_work_service':
        return ['body work', 'body', 'paint', 'dent', 'collision', 'bumper', 'fender'];

      default:
        return [];
    }
  }

  function getServiceLabel(serviceValue) {
    switch (lower(serviceValue)) {
      case 'engine_service':
        return 'Engine Service';

      case 'electrical_battery_service':
        return 'Electrical & Battery Service';

      case 'brake_service':
        return 'Brake Service';

      case 'tire_wheel_service':
        return 'Tire & Wheel Service';

      case 'ac_service':
        return 'Air Conditioning Service';

      case 'body_work_service':
        return 'Body Work Service';

      default:
        return 'Service Recommendation';
    }
  }

  function getSearchableText(item) {
    return (splitServices(item && item.services).join(' ') + ' ' + String(item && item.description || '')).toLowerCase();
  }

  function getMatchingKeywords(item, serviceValue) {
    var searchableText = getSearchableText(item);
    return getServiceKeywords(serviceValue).filter(function (keyword) {
      return searchableText.indexOf(lower(keyword)) !== -1;
    });
  }

  function matchesService(item, serviceValue) {
    return getMatchingKeywords(item, serviceValue).length > 0;
  }

  function filterShops(items, serviceValue) {
    var list = Array.isArray(items) ? items : [];
    if (!getServiceKeywords(serviceValue).length) return list.slice();

    return list.filter(function (item) {
      return matchesService(item, serviceValue);
    });
  }

  return {
    lower: lower,
    splitServices: splitServices,
    getServiceKeywords: getServiceKeywords,
    getServiceLabel: getServiceLabel,
    getMatchingKeywords: getMatchingKeywords,
    matchesService: matchesService,
    filterShops: filterShops
  };
});
