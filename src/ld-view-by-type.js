(function(document) {
  'use strict';

  var LdTypedView = Object.create(HTMLElement.prototype);

  LdTypedView.matchModel = function(model) {
    if (model['@type']) {
      if (typeof model['@type'] === 'Array') {
        return model['@type'].some(function (type) {
          return type === this.getAttribute('type');
        }, this);
      } else{
        return model['@type'] === this.getAttribute('type');
      }
    }

    return false;
  };

  document.registerElement('ld-view-by-type', {
    prototype: LdTypedView
  });

})(document);