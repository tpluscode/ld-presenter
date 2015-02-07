// @license Copyright (C) 2015 Tomasz Pluskiewicz - MIT license
// Based on app-router by Erik Ringsmuth
(function(window, document) {
  'use strict';
  var importedURIs = {};

  var LdPresenter = Object.create(HTMLElement.prototype);

  LdPresenter.attachedCallback = function() {
    this.init();
  };

  LdPresenter.init = function() {
    var currentModel = { };

    var presenter = this;
    if (presenter.isInitialized) {
      return;
    }
    presenter.isInitialized = true;

    Object.defineProperty(presenter, 'model', {
      set: function(value) {
        currentModel = value;
        onModelChange(presenter);
      },
      get: function() {
        return currentModel;
      }
    });
  };

  // fire(type, detail, node) - Fire a new CustomEvent(type, detail) on the node
  //
  // listen with document.querySelector('app-router').addEventListener(type, function(event) {
  //   event.detail, event.preventDefault()
  // })
  function fire(type, detail, node) {
    // create a CustomEvent the old way for IE9/10 support
    var event = document.createEvent('CustomEvent');

    // initCustomEvent(type, bubbles, cancelable, detail)
    event.initCustomEvent(type, false, true, detail);

    // returns false when event.preventDefault() is called, true otherwise
    return node.dispatchEvent(event);
  }

  var onModelChange = function(presenter) {
    var view = presenter.firstElementChild;

    while (view) {
      if (view.matchModel && view.matchModel(presenter.model)) {
        activateView(presenter, view);
        return;
      }

      view = view.nextSibling;
    }

    fire('not-found', {}, presenter);
  };

  // Activate the view
  function activateView(presenter, view, model) {
    var eventDetail = {
      model: model,
      view: view,
      previousView: presenter.view
    };
    if (!fire('activate-view-start', eventDetail, presenter)) {
      return;
    }

    if (presenter.view) {
      presenter.view.removeAttribute('active');
    }

    presenter.view = view;
    presenter.view.setAttribute('active', 'active');

    // import custom element or template
    if (view.hasAttribute('import')) {
      importAndActivate(presenter, view.getAttribute('import'), view, model, eventDetail);
    }
    // pre-loaded custom element
    else if (view.hasAttribute('element')) {
      activateCustomElement(presenter, view.getAttribute('element'), view, model, eventDetail);
    }
    // inline template
    else if (view.firstElementChild && view.firstElementChild.tagName === 'TEMPLATE') {
      activateTemplate(presenter, view.firstElementChild, view, model, eventDetail);
    }
  }

  // Import and activate a custom element or template
  function importAndActivate(presenter, importUri, view, model, eventDetail) {
    var importLink;
    function importLoadedCallback() {
      activateImport(presenter, importLink, importUri, view, model, eventDetail);
    }

    if (!importedURIs.hasOwnProperty(importUri)) {
      // hasn't been imported yet
      importedURIs[importUri] = true;
      importLink = document.createElement('link');
      importLink.setAttribute('rel', 'import');
      importLink.setAttribute('href', importUri);
      importLink.addEventListener('load', importLoadedCallback);
      document.head.appendChild(importLink);
    } else {
      // previously imported. this is an async operation and may not be complete yet.
      importLink = document.querySelector('link[href="' + importUri + '"]');
      if (importLink.import) {
        // import complete
        importLoadedCallback();
      } else {
        // wait for `onload`
        importLink.addEventListener('load', importLoadedCallback);
      }
    }
  }

  // Activate the imported custom element or template
  function activateImport(presenter, importLink, importUri, view, model, eventDetail) {
    // make sure the user didn't navigate to a different view while it loaded
    if (view.hasAttribute('active')) {
      if (view.hasAttribute('template')) {
        // template
        activateTemplate(presenter, importLink.import.querySelector('template'), view, model, eventDetail);
      } else {
        // custom element
        activateCustomElement(presenter, view.getAttribute('element') || importUri.split('/').slice(-1)[0].replace('.html', ''), view, model, eventDetail);
      }
    }
  }

  // Create an instance of the template
  function activateTemplate(presenter, template, view, model, eventDetail) {
    var templateInstance;
    if ('createInstance' in template) {
      // template.createInstance(model) is a Polymer method that binds a model to a template and also fixes
      // https://github.com/erikringsmuth/app-router/issues/19
      var routeModel = createModel(presenter, view, model);
      templateInstance = template.createInstance(routeModel);
    } else {
      templateInstance = document.importNode(template.content, true);
    }
    activateElement(presenter, templateInstance, eventDetail);
  }

  // Data bind the custom element then activate it
  function activateCustomElement(presenter, elementName, view, model, eventDetail) {
    var customElement = document.createElement(elementName);
    var routeModel = createModel(presenter, view, model, eventDetail);
    for (var property in model) {
      if (routeModel.hasOwnProperty(property)) {
        customElement[property] = routeModel[property];
      }
    }
    activateElement(presenter, customElement, eventDetail);
  }

  // Create the route's model
  function createModel(presenter, view, model, eventDetail) {
    var routeModel = { model: model };
    if (view.hasAttribute('bindRouter') || presenter.hasAttribute('bindRouter')) {
      routeModel.router = presenter;
    }

    eventDetail.model = model;
    fire('before-data-binding', eventDetail, presenter);
    fire('before-data-binding', eventDetail, eventDetail.route);
    return routeModel;
  }

  // Replace the active route's content with the new element
  function activateElement(presenter, element, eventDetail) {
    if (!presenter.current) {
      presenter.current = document.createElement('div');
      presenter.appendChild(presenter.current);
    }

    // add the new content
    while (presenter.current.firstChild) {
      presenter.current.removeChild(presenter.current.firstChild);
    }
    presenter.current.appendChild(element);

    fire('activate-view-end', eventDetail, presenter);
    fire('activate-view-end', eventDetail, presenter.view);
  }

  document.registerElement('ld-presenter', {
    prototype: LdPresenter
  });

})(window, document);