if (!customElements.get('variant-selects')) {

  /**
   *  @class
   *  @function VariantSelects
   */
  class VariantSelects extends HTMLElement {
    constructor() {
      super();
      this.sticky = this.dataset.sticky;
      this.featured = this.dataset.featured;
      this.isDisabledFeature = this.dataset.isDisabled;
      this.addEventListener('change', this.onVariantChange);
      this.other = Array.from(document.querySelectorAll('variant-selects')).filter((selector) => {
        return selector != this;
      });
    }

    connectedCallback() {
      this.updateOptions();
      this.updateMasterId();
      this.setDisabled();
    }

    onVariantChange() {
      this.updateOptions();
      this.updateMasterId();
      this.toggleAddButton(true, '', false);
      this.updatePickupAvailability();
      this.removeErrorMessage();
      this.updateVariantText();
      this.setDisabled();

      if (!this.currentVariant) {
        this.toggleAddButton(true, '', true);
        this.setUnavailable();
      } else {
        this.updateMedia();
        if (!this.featured) {
          this.updateURL();
        }
        this.updateVariantInput();
        this.renderProductInfo();
        //this.updateShareUrl();
      }

      this.updateOther();
      dispatchCustomEvent('product:variant-change', {
        variant: this.currentVariant,
        sectionId: this.dataset.section
      });
    }

    updateOptions() {
      this.fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = [];
      this.fieldsets.forEach((fieldset, i) => {
        if (fieldset.querySelector('select')) {
          this.options.push(fieldset.querySelector('select').value);
        } else if (fieldset.querySelectorAll('input').length) {
          this.options.push(fieldset.querySelector('input:checked').value);
        }
      });
    }
    updateVariantText() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      fieldsets.forEach((item, i) => {
        let label = item.querySelector('.form__label__value');
        if (label) {
          label.innerHTML = this.options[i];
        }
      });
    }
    updateMasterId() {
      this.currentVariant = this.getVariantData().find((variant) => {
        return !variant.options.map((option, index) => {
          return this.options[index] === option;
        }).includes(false);
      });
    }

    updateOther() {
      if (this.dataset.updateUrl === 'false') {
        return;
      }
      if (this.other.length) {
        let fieldsets = this.other[0].querySelectorAll('fieldset'),
          fieldsets_array = Array.from(fieldsets);
        this.options.forEach((option, i) => {
          if (fieldsets_array[i].querySelector('select')) {
            fieldsets_array[i].querySelector(`select`).value = option;
          } else if (fieldsets_array[i].querySelectorAll('input').length) {
            fieldsets_array[i].querySelector(`input[value='${option}']`).checked = true;
          }
        });
        this.other[0].updateOptions();
        this.other[0].updateMasterId();
        this.other[0].updateVariantText();
        this.other[0].setDisabled();
      }
    }

    updateMedia() {
      if (!this.currentVariant) return;
      if (!this.currentVariant.featured_media) return;

      let productSlider = document.querySelector('.thb-product-detail .product-images'),
        thumbnails = document.querySelector('.thb-product-detail #Product-Thumbnails');

      this.setActiveMedia(`#Slide-${this.dataset.section}-${this.currentVariant.featured_media.id}`, `#Thumb-${this.dataset.section}-${this.currentVariant.featured_media.id}`, productSlider, thumbnails);
    }
    setActiveMedia(mediaId, thumbId, productSlider, thumbnails) {
      var hide_variants = productSlider.dataset.hideVariants == 'true',
        flkty = Flickity.data(productSlider),
        images = productSlider.querySelectorAll('.product-images__slide');

      if (flkty && hide_variants) {
        [].forEach.call(images, function(el) {
          el.classList.remove('is-selected');
        });
        productSlider.querySelector(mediaId).classList.add('is-selected');
        productSlider.reInit();
        productSlider.selectCell(mediaId);

        if (thumbnails) {
          let activeThumb = thumbnails.querySelector(thumbId);

          thumbnails.prepend(activeThumb);
        }
      } else if (flkty) {
        productSlider.selectCell(mediaId);
      }

    }

    updateURL() {
      if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
      window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateShareUrl() {
      const shareButton = document.getElementById(`Share-${this.dataset.section}`);
      if (!shareButton) return;
      shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateVariantInput() {
      const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment`);
      productForms.forEach((productForm) => {
        const input = productForm.querySelector('input[name="id"]');
        input.value = this.currentVariant.id;
        input.dispatchEvent(new Event('change', {
          bubbles: true
        }));
      });
    }

    updatePickupAvailability() {
      const pickUpAvailability = document.querySelector('.pickup-availability-wrapper');

      if (!pickUpAvailability) return;

      if (this.currentVariant && this.currentVariant.available) {
        pickUpAvailability.fetchAvailability(this.currentVariant.id);
      } else {
        pickUpAvailability.removeAttribute('available');
        pickUpAvailability.innerHTML = '';
      }
    }

    removeErrorMessage() {
      const section = this.closest('section');
      if (!section) return;

      const productForm = section.querySelector('product-form');
      if (productForm) productForm.handleErrorMessage();
    }

    getSectionsToRender() {
      return [`price-${this.dataset.section}`, `price-${this.dataset.section}--sticky`, `product-image-${this.dataset.section}--sticky`, `inventory-${this.dataset.section}`, `sku-${this.dataset.section}`, `quantity-${this.dataset.section}`];
    }

    renderProductInfo() {
      let sections = this.getSectionsToRender();

      fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');

          sections.forEach((id) => {
            const destination = document.getElementById(id);
            const source = html.getElementById(id);

            if (source && destination) destination.innerHTML = source.innerHTML;

            const price = document.getElementById(id);
            const price_fixed = document.getElementById(id + '--sticky');

            if (price) price.classList.remove('visibility-hidden');
            if (price_fixed) price_fixed.classList.remove('visibility-hidden');

          });
          this.toggleAddButton(!this.currentVariant.available, window.theme.variantStrings.soldOut);

        });
    }

    toggleAddButton(disable = true, text = false, modifyClass = true) {
      const productForm = document.getElementById(`product-form-${this.dataset.section}`);
      if (!productForm) return;

      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');

      if (!submitButtons) return;

      submitButtons.forEach((submitButton) => {
        const submitButtonText = submitButton.querySelector('.single-add-to-cart-button--text');

        if (!submitButtonText) return;

        if (disable) {
          submitButton.setAttribute('disabled', 'disabled');
          if (text) submitButtonText.textContent = text;
        } else {
          submitButton.removeAttribute('disabled');
          submitButton.classList.remove('loading');
          submitButtonText.textContent = window.theme.variantStrings.addToCart;
        }
      });

      if (!modifyClass) return;
    }

    setUnavailable() {
      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');
      const price = document.getElementById(`price-${this.dataset.section}`);
      const price_fixed = document.getElementById(`price-${this.dataset.section}--sticky`);

      submitButtons.forEach((submitButton) => {
        const submitButtonText = submitButton.querySelector('.single-add-to-cart-button--text');
        if (!submitButton) return;
        submitButtonText.textContent = window.theme.variantStrings.unavailable;
        submitButton.classList.add('sold-out');
      });
      if (price) price.classList.add('visibility-hidden');
      if (price_fixed) price_fixed.classList.add('visibility-hidden');
    }

    setDisabled() {
      if (this.isDisabledFeature != 'true') {
        return;
      }
      const variant_data = this.getVariantData();


      if (variant_data) {

        const selected_options = this.currentVariant.options.map((value, index) => {
          return {
            value,
            index: `option${index+1}`
          };
        });
        const available_options = this.createAvailableOptionsTree(variant_data, selected_options);


        this.fieldsets.forEach((fieldset, i) => {
          const fieldset_options = Object.values(available_options)[i];

          if (fieldset_options) {
            if (fieldset.querySelector('select')) {
              fieldset_options.forEach((option, option_i) => {
                if (option.isUnavailable) {
                  fieldset.querySelector('option[value=' + JSON.stringify(option.value) + ']').disabled = true;
                } else {
                  fieldset.querySelector('option[value=' + JSON.stringify(option.value) + ']').disabled = false;
                }
              });
            } else if (fieldset.querySelectorAll('input').length) {
              fieldset.querySelectorAll('input').forEach((input, input_i) => {
                input.classList.toggle('is-disabled', fieldset_options[input_i].isUnavailable);
              });
            }
          }
        });

      }
      return true;
    }
    createAvailableOptionsTree(variant_data, selected_options) {
      // Reduce variant array into option availability tree
      return variant_data.reduce((options, variant) => {

        // Check each option group (e.g. option1, option2, option3) of the variant
        Object.keys(options).forEach(index => {

          if (variant[index] === null) return;

          let entry = options[index].find(option => option.value === variant[index]);

          if (typeof entry === 'undefined') {
            // If option has yet to be added to the options tree, add it
            entry = {
              value: variant[index],
              isUnavailable: true
            };
            options[index].push(entry);
          }

          // Check how many selected option values match a variant
          const countVariantOptionsThatMatchCurrent = selected_options.reduce((count, {
            value,
            index
          }) => {
            return variant[index] === value ? count + 1 : count;
          }, 0);

          // Only enable an option if an available variant matches all but one current selected value
          if (countVariantOptionsThatMatchCurrent >= selected_options.length - 1) {
            entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
          }

          // Make sure if a variant is unavailable, disable currently selected option
          if ((!this.currentVariant || !this.currentVariant.available) && selected_options.find((option) => option.value === entry.value && index === option.index)) {
            entry.isUnavailable = true;
          }

          // First option is always enabled
          if (index === 'option1') {
            entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
          }
        });

        return options;
      }, {
        option1: [],
        option2: [],
        option3: []
      });
    }

    getVariantData() {
      this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
      return this.variantData;
    }
  }
  customElements.define('variant-selects', VariantSelects);

  /**
   *  @class
   *  @function VariantRadios
   */
  class VariantRadios extends VariantSelects {
    constructor() {
      super();
    }

    updateOptions() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = fieldsets.map((fieldset) => {
        return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
      });
    }
  }

  customElements.define('variant-radios', VariantRadios);
}
if (!customElements.get('product-slider')) {
  /**
   *  @class
   *  @function ProductSlider
   */
  class ProductSlider extends HTMLElement {
    constructor() {
      super();

      this.addEventListener('change', this.setupProductGallery);
    }
    connectedCallback() {
      const product_container = this.closest('.thb-product-detail');
      const thumbnail_container = product_container.querySelector('.product-thumbnail-container');
      this.video_containers = this.querySelectorAll('.product-single__media-external-video--play');

      this.hide_variants = this.dataset.hideVariants == 'true';
      this.thumbnails = thumbnail_container.querySelectorAll('.product-thumbnail');
      this.prev_button = this.querySelector('.flickity-prev');
      this.next_button = this.querySelector('.flickity-next');
      this.options = {
        wrapAround: true,
        pageDots: true,
        contain: true,
        adaptiveHeight: true,
        initialIndex: '.is-initial-selected',
        prevNextButtons: false,
        fade: false,
        cellSelector: '.product-images__slide'
      };

      if (this.hide_variants) {
        this.options.cellSelector = '.product-images__slide, .product-images__slide-item--variant.is-selected';
      }

      // Start Slider
      this.init();
    }
    init() {
      this.flkty = new Flickity(this, this.options);

      this.selectedIndex = this.flkty.selectedIndex;

      // Setup Events
      this.setupEvents();

      // Start Gallery
      this.setupProductGallery();
    }
    reInit() {
      this.flkty.destroy();

      this.flkty = new Flickity(this, this.options);

      // Setup Events
      this.setupEvents();

      this.selectedIndex = this.flkty.selectedIndex;
    }
    setupEvents() {
      const _this = this;
      if (this.prev_button) {
        this.prev_button.addEventListener('click', (event) => {
          this.flkty.previous();
        });
        this.prev_button.addEventListener('keyup', (event) => {
          this.flkty.previous();
          event.preventDefault();
        });
      }
      if (this.next_button) {
        this.next_button.addEventListener('click', (event) => {
          this.flkty.next();
        });
        this.next_button.addEventListener('keyup', (event) => {
          this.flkty.next();
          event.preventDefault();
        });
      }
      this.video_containers.forEach((container) => {
        container.querySelector('button').addEventListener('click', function() {
          container.setAttribute('hidden', '');
        });
      });
      this.flkty.on('settle', function(index) {
        _this.selectedIndex = index;
      });
      this.flkty.on('change', (index) => {

        let previous_slide = this.flkty.cells[_this.selectedIndex].element,
          previous_media = previous_slide.querySelector('.product-single__media'),
          slide = this.flkty.cells[index].element,
          media = slide.querySelector('.product-single__media'),
          active_thumb = this.thumbnails[index];

        this.thumbnails.forEach((item, i) => {
          item.classList.remove('is-initial-selected');
        });
        active_thumb.classList.add('is-initial-selected');
        requestAnimationFrame(() => {
          if (active_thumb.offsetParent === null) {
            return;
          }
          const windowHalfHeight = active_thumb.offsetParent.clientHeight / 2,
            windowHalfWidth = active_thumb.offsetParent.clientWidth / 2;
          active_thumb.parentElement.scrollTo({
            left: 0,
            top: active_thumb.offsetTop - windowHalfHeight + active_thumb.clientHeight / 2,
            behavior: 'smooth'
          });
        });
        // Stop previous video
        if (previous_media.classList.contains('product-single__media-external-video')) {
          if (previous_media.dataset.provider === 'youtube') {
            previous_media.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
              event: "command",
              func: "pauseVideo",
              args: ""
            }), "*");
          } else if (previous_media.dataset.provider === 'vimeo') {
            previous_media.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
              method: "pause"
            }), "*");
          }
          previous_media.querySelector('.product-single__media-external-video--play').removeAttribute('hidden');
        } else if (previous_media.classList.contains('product-single__media-native-video')) {
          previous_media.querySelector('video').pause();
        }

      });

      this.thumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', () => {
          this.thumbnailClick(thumbnail, index);
        });
      });
    }
    thumbnailClick(thumbnail, index) {
      [].forEach.call(this.thumbnails, function(el) {
        el.classList.remove('is-initial-selected');
      });
      thumbnail.classList.add('is-initial-selected');
      this.flkty.select(index);
    }
    setDraggable(draggable) {
      this.flkty.options.draggable = draggable;
      this.flkty.updateDraggable();
    }
    selectCell(mediaId) {
      this.flkty.selectCell(mediaId);
    }
    setupProductGallery() {
      if (!this.querySelectorAll('.product-single__media-zoom').length) {
        return;
      }
      this.setEventListeners();
    }
    buildItems() {
      this.activeImages = Array.from(this.querySelectorAll('.product-images__slide .product-single__media-image, .product-images__slide-item--variant.is-selected .product-single__media-image'));
      return this.activeImages.map((item) => {
        let index = [].indexOf.call(item.parentNode.parentNode.children, item.parentNode);

        let activelink = item.querySelector('.product-single__media-zoom');

        activelink.dataset.index = index;
        return {
          src: activelink.getAttribute('href'),
          msrc: activelink.dataset.msrc,
          w: activelink.dataset.w,
          h: activelink.dataset.h
        };
      });
    }
    setEventListeners() {
      this.links = this.querySelectorAll('.product-single__media-zoom');
      this.pswpElement = document.querySelectorAll('.pswp')[0];
      this.pswpOptions = {
        maxSpreadZoom: 2,
        loop: false,
        allowPanToNext: false,
        closeOnScroll: false,
        showHideOpacity: false,
        arrowKeys: true,
        history: false,
        captionEl: false,
        fullscreenEl: false,
        zoomEl: false,
        shareEl: false,
        counterEl: true,
        arrowEl: true,
        preloaderEl: true,
        getThumbBoundsFn: () => {
          const thumbnail = this.querySelector('.product-images__slide.is-selected'),
            pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
            rect = thumbnail.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top + pageYScroll,
            w: rect.width
          };
        }
      };


      this.links.forEach((link => {
        link.addEventListener('click', (e) => this.zoomClick(e, link));
      }));
    }
    zoomClick(e, link) {
      this.items = this.buildItems();
      this.pswpOptions.index = parseInt(link.dataset.index, 10);
      if (typeof PhotoSwipe !== 'undefined') {
        let pswp = new PhotoSwipe(this.pswpElement, PhotoSwipeUI_Default, this.items, this.pswpOptions);
        pswp.listen('firstUpdate', function() {
          pswp.listen('parseVerticalMargin', function(item) {
            item.vGap = {
              top: 50,
              bottom: 50
            };
          });
        });
        pswp.init();
      }
      e.preventDefault();
    }
  }
  customElements.define('product-slider', ProductSlider);
}

/**
 *  @class
 *  @function ProductForm
 */
if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.sticky = this.dataset.sticky;
      this.form = document.getElementById(`product-form-${this.dataset.section}`);
      this.form.querySelector('[name=id]').disabled = false;
      if (!this.sticky) {
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      }
      this.cartNotification = document.querySelector('cart-notification');
      this.body = document.body;

      this.hideErrors = this.dataset.hideErrors === 'true';
    }

    onSubmitHandler(evt) {
      evt.preventDefault();
      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');

      submitButtons.forEach((submitButton) => {
        if (submitButton.classList.contains('loading')) return;
        submitButton.setAttribute('aria-disabled', true);
        submitButton.classList.add('loading');
      });

      this.handleErrorMessage();


      const config = {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/javascript'
        }
      };
      let formData = new FormData(this.form);

      formData.append('sections', this.getSectionsToRender().map((section) => section.section));
      formData.append('sections_url', window.location.pathname);
      config.body = formData;

      fetch(`${theme.routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            dispatchCustomEvent('product:variant-error', {
              source: 'product-form',
              productVariantId: formData.get('id'),
              errors: response.description,
              message: response.message
            });
            this.handleErrorMessage(response.description);
            return;
          }

          this.renderContents(response);

          dispatchCustomEvent('cart:item-added', {
            product: response.hasOwnProperty('items') ? response.items[0] : response
          });
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          submitButtons.forEach((submitButton) => {
            submitButton.classList.remove('loading');
            submitButton.removeAttribute('aria-disabled');
          });
        });
    }

    getSectionsToRender() {
      return [{
        id: 'Cart',
        section: 'main-cart',
        selector: '.thb-cart-form'
      },
      {
        id: 'Cart-Drawer',
        section: 'cart-drawer',
        selector: '.cart-drawer'
      },
      {
        id: 'cart-drawer-toggle',
        section: 'cart-bubble',
        selector: '.thb-item-count'
      }];
    }
    renderContents(parsedState) {
      this.getSectionsToRender().forEach((section => {
        if (!document.getElementById(section.id)) {
          return;
        }
        const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
        elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);

        if (typeof CartDrawer !== 'undefined') {
          new CartDrawer();
        }
        if (typeof Cart !== 'undefined') {
          new Cart().renderContents(parsedState);
        }
      }));



      let product_drawer = document.getElementById('Product-Drawer'),
        search_drawer = document.getElementById('Search-Drawer');

      if (search_drawer.classList.contains('active')) {
        search_drawer.classList.remove('active');
      }
      if (product_drawer && product_drawer.contains(this)) {
        product_drawer.classList.remove('active');
        this.body.classList.remove('open-cc--product');
        if (document.getElementById('Cart-Drawer')) {
          this.body.classList.add('open-cc');
          document.getElementById('Cart-Drawer').classList.add('active');
        }
      } else if (document.getElementById('Cart-Drawer')) {
        this.body.classList.add('open-cc');
        document.getElementById('Cart-Drawer').classList.add('active');
        dispatchCustomEvent('cart-drawer:open');
      }
    }
    getSectionInnerHTML(html, selector = '.shopify-section') {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }
    handleErrorMessage(errorMessage = false) {
      if (this.hideErrors) return;
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}


/**
 *  @class
 *  @function ProductAddToCartSticky
 */
if (!customElements.get('product-add-to-cart-sticky')) {
  class ProductAddToCartSticky extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.setupObservers();
      this.setupToggle();
    }
    setupToggle() {
      const button = this.querySelector('.product-add-to-cart-sticky--inner'),
        content = this.querySelector('.product-add-to-cart-sticky--content'),
        tl = gsap.timeline({
          reversed: true,
          paused: true,
          onStart: () => {
            button.classList.add('sticky-open');
          },
          onReverseComplete: () => {
            button.classList.remove('sticky-open');
          }
        });

      tl
        .set(content, {
          display: 'block',
          height: 'auto'
        }, 'start')
        .from(content, {
          height: 0,
          duration: 0.25
        }, 'start+=0.001');

      button.addEventListener('click', function() {
        tl.reversed() ? tl.play() : tl.reverse();

        return false;
      });

    }
    setupObservers() {
      let _this = this,
        observer = new IntersectionObserver(function(entries) {
          entries.forEach((entry) => {
            if (entry.target === footer) {
              if (entry.intersectionRatio > 0) {
                _this.classList.remove('sticky--visible');
              } else if (entry.intersectionRatio == 0 && _this.formPassed) {
                _this.classList.add('sticky--visible');
              }
            }
            if (entry.target === form) {
              let boundingRect = form.getBoundingClientRect();

              if (entry.intersectionRatio === 0 && window.scrollY > (boundingRect.top + boundingRect.height)) {
                _this.formPassed = true;
                _this.classList.add('sticky--visible');
              } else if (entry.intersectionRatio === 1) {
                _this.formPassed = false;
                _this.classList.remove('sticky--visible');
              }
            }
          });
        }, {
          threshold: [0, 1]
        }),
        form = document.getElementById(`product-form-${this.dataset.section}`),
        footer = document.getElementById('footer');
      _this.formPassed = false;
      observer.observe(form);
      observer.observe(footer);
    }
  }

  customElements.define('product-add-to-cart-sticky', ProductAddToCartSticky);
}

/**
 *  @class
 *  @function ProductSidePanelLinks
 */
if (!customElements.get('side-panel-links')) {
  class ProductSidePanelLinks extends HTMLElement {
    constructor() {
      super();
      this.links = this.querySelectorAll('button');
      this.drawer = document.getElementById('Product-Information-Drawer');
      this.buttons = this.drawer.querySelector('.side-panel-content--tabs');
      this.panels = this.drawer.querySelector('.side-panel-content--inner').querySelectorAll('.side-panel-content--tab-panel');
      this.body = document.body;
    }
    connectedCallback() {
      this.setupObservers();
    }
    disconnectedCallback() {

    }
    setupObservers() {
      this.links.forEach((item, i) => {
        item.addEventListener('click', (e) => {
          this.body.classList.add('open-cc');
          this.buttons.toggleActiveClass(i);
          this.drawer.classList.add('active');
        });
      });
    }
  }

  customElements.define('side-panel-links', ProductSidePanelLinks);
}