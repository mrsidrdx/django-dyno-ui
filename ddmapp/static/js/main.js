$('.toggle-menu').click (function(){
  $(this).toggleClass('active');
  $('#menu').toggleClass('open');
});

class ScrollableComponentElement extends HTMLElement {
  elements = {
    vertical: {},
    horizontal: {},
  };
  sizes = {
    vertical: {},
    horizontal: {},
  };
  ratios = {
    vertical: 1,
    horizontal: 1,
  };
  isScrollingWithThumb = {
    vertical: false,
    horizontal: false,
  };
  scrollingWithThumbOrigin = {
    vertical: {},
    horizontal: {},
  };
  scrollbarSizeAnimationFrame = {
    vertical: null,
    horizontal: null,
  };
  scrollbarPositionAnimationFrame = {
    vertical: null,
    horizontal: null,
  };

  get scrollHeight() {
    return this.elements.content.scrollHeight;
  }

  get scrollWidth() {
    return this.elements.content.scrollWidth;
  }

  get scrollLeft() {
    return this.elements.content.scrollLeft;
  }

  set scrollLeft(scrollLeft) {
    this.elements.content.scrollLeft = scrollLeft;
  }

  get scrollTop() {
    return this.elements.content.scrollTop;
  }

  set scrollTop(scrollTop) {
    this.elements.content.scrollTop = scrollTop;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
        }
        :host {
          --scrollbar-fill-color: transparent;
          --scrollbar-fill-color-hover: transparent;
          --scrollbar-thumb-fill-color: #FF3E4D;
          --scrollbar-thumb-fill-color-hover: #E71C23;
          --scrollbar-width: 15px;
          --scrollbar-spacing: 2px;

          position: relative;
          display: grid;
          overflow: hidden;
        }
        .viewport {
          z-index: 0;
          display: block;
          width: 100%;
          overflow: auto;
          scrollbar-width: none;
          outline: none;
        }
        .viewport::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
        .viewport:hover,
        .viewport:not(:focus):focus-within,
        .viewport.touch,
        .viewport.scrolling-with-vertical-thumb,
        .viewport.scrolling-with-horizontal-thumb {
          will-change: scroll-position;
        }
        .viewport.scrolling-with-vertical-thumb,
        .viewport.scrolling-with-horizontal-thumb {
          pointer-events: none;
        }
        .scrollbar {
          pointer-events: all;
          user-select: none;
          position: absolute;
          background-color: var(--scrollbar-fill-color);
          opacity: 0;
          transition: opacity 800ms ease-in-out 300ms;
        }
        .scrollbar:hover,
        .scrollbar.scrolling-with-thumb,
        .viewport:hover ~ .scrollbar,
        .viewport:not(:focus):focus-within ~ .scrollbar,
        .viewport.touch ~ .scrollbar {
          will-change: opacity;
          opacity: 1;
          transition-duration: 150ms;
          transition-delay: 0s;
        }
        .scrollbar:hover,
        .scrollbar.scrolling-with-thumb {
          z-index: 30;
          background-color: var(--scrollbar-fill-color-hover);
        }
        .scrollbar.hidden {
          display: none;
        }
        .vertical-scrollbar {
          z-index: 20;
          width: var(--scrollbar-width);
          right: 0;
          top: 0;
          bottom: 0;
        }
        .horizontal-scrollbar {
          z-index: 10;
          height: var(--scrollbar-width);
          left: 0;
          right: 0;
          bottom: 0;
        }
        .scrollbar-track {
          height: 100%;
          width: 100%;
        }
        .scrollbar-thumb {
          height: 100%;
          width: 100%;
          background-color: var(--scrollbar-thumb-fill-color);
          background-clip: padding-box;
          border: var(--scrollbar-spacing) solid transparent;
          border-radius: var(--scrollbar-width);
          transform: translate3d(0, 0, 0);
          transition: background-color 150ms ease-out;
        }
        .scrollbar-thumb:hover,
        .scrollbar.scrolling-with-thumb .scrollbar-thumb {
          background-color: var(--scrollbar-thumb-fill-color-hover);
        }
        .viewport {
          position: relative;
        }
        .test {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 10px;
          background-color: red;
        }
      </style>
      <div class="viewport" tabindex="-1">
        <div class="content">
          <slot></slot>
        </div>
      </div>
      <div class="scrollbar vertical-scrollbar">
        <div class="scrollbar-track">
          <div class="scrollbar-thumb"></div>
        </div>
      </div>
      <div class="scrollbar horizontal-scrollbar">
        <div class="scrollbar-track">
          <div class="scrollbar-thumb"></div>
        </div>
      </div>
    `;

    this.elements.viewport = this.shadowRoot.querySelector('.viewport');
    this.elements.content = this.elements.viewport.querySelector('.content');

    for (let orientation of ['vertical', 'horizontal']) {
      this.elements[orientation].scrollbar = this.shadowRoot.querySelector(`.${[orientation]}-scrollbar`);
      this.elements[orientation].scrollbarTrack = this.elements[orientation].scrollbar.querySelector('.scrollbar-track');
      this.elements[orientation].scrollbarThumb = this.elements[orientation].scrollbarTrack.querySelector('.scrollbar-thumb');

      // Build entire scrollbar
      this.updateCache(orientation);
      this.updateScrollbarThumbSize(orientation);
      this.updateScrollbarThumbPosition(orientation);

      // Scroll to mouse position in scrollbar's track
      this.elements[orientation].scrollbarTrack.addEventListener('mousedown', (event) => {
        const scrollBarTrackBoundingBox = this.elements[orientation].scrollbarTrack.getBoundingClientRect();
        if (orientation === 'vertical') {
          this.elements.viewport.scrollTo({
            top: (event.pageY - scrollBarTrackBoundingBox.top - this.sizes[orientation].scrollbarThumb / 2) * this.ratios[orientation],
            behavior: 'smooth',
          });
        }
        else {
          this.elements.viewport.scrollTo({
            left: (event.pageX - scrollBarTrackBoundingBox.left - this.sizes[orientation].scrollbarThumb / 2) * this.ratios[orientation],
            behavior: 'smooth',
          });
        }
      }, { passive: true });

      // Gives back the focus to the viewport after clicking the scrollbar,
      // so we can continue to scroll using the keyboard (arrows, page down, page up, ...)
      this.elements[orientation].scrollbar.addEventListener('click', () => {
        this.elements.viewport.focus();
      }, { passive: true });

      // Start of scrolling with thumb
      ['mousedown', 'touchstart'].forEach((type) => {
        this.elements[orientation].scrollbarThumb.addEventListener(type, (event) => {
          event.stopPropagation();
          document.body.style.setProperty('pointer-events', 'none');
          this.isScrollingWithThumb[orientation] = true;
          this.elements.viewport.classList.add(`scrolling-with-${orientation}-thumb`);
          this.elements[orientation].scrollbar.classList.add('scrolling-with-thumb');
          this.scrollingWithThumbOrigin.pageY = event.touches ? event.touches[0].pageY : event.pageY;
          this.scrollingWithThumbOrigin.pageX = event.touches ? event.touches[0].pageX : event.pageX;
          this.scrollingWithThumbOrigin.scrollTop = this.elements.viewport.scrollTop;
          this.scrollingWithThumbOrigin.scrollLeft = this.elements.viewport.scrollLeft;
        }, { passive: true });
      });
    }

    // Scrolling with thumb
    ['mousemove', 'touchmove'].forEach((type) => {
      document.addEventListener(type, () => {
        if (this.isScrollingWithThumb.vertical) {
          let pageY = event.touches ? event.touches[0].pageY : event.pageY;
          this.elements.viewport.scrollTop = this.scrollingWithThumbOrigin.scrollTop + (pageY - this.scrollingWithThumbOrigin.pageY) / this.elements.vertical.scrollbarTrack.clientHeight * this.elements.viewport.scrollHeight;
        }
        else if (this.isScrollingWithThumb.horizontal) {
          let pageX = event.touches ? event.touches[0].pageX : event.pageX;
          this.elements.viewport.scrollLeft = this.scrollingWithThumbOrigin.scrollLeft + (pageX - this.scrollingWithThumbOrigin.pageX) / this.elements.horizontal.scrollbarTrack.clientWidth * this.elements.viewport.scrollWidth;
        }
      }, { passive: true });
    });

    // End of scrolling with thumb
    ['mouseup', 'touchend'].forEach((type) => {
      document.addEventListener(type, () => {
        for (let orientation of ['vertical', 'horizontal']) {
          if (this.isScrollingWithThumb[orientation]) {
            document.body.style.removeProperty('pointer-events');
            this.isScrollingWithThumb[orientation] = false;
            this.elements.viewport.classList.remove(`scrolling-with-${orientation}-thumb`);
            this.elements[orientation].scrollbar.classList.remove('scrolling-with-thumb');
            // Gives back the focus to the viewport after clicking the scrollbar's thumb,
            // so we can continue to scroll using the keyboard (arrows, page down, page up, ...)
            this.elements.viewport.focus();
          }
        }
      }, { passive: true });
    });

    // Display scrollbars when scrolling with touch gestures
    this.elements.viewport.addEventListener('touchstart', () => {
      this.elements.viewport.classList.add('touch');
    }, { passive: true });

    // Hide scrollbars when scrolling with touch gestures
    this.elements.viewport.addEventListener('touchend', () => {
      this.elements.viewport.classList.remove('touch');
    }, { passive: true });

    // Update scrollbar's thumb position when scrolling
    this.elements.viewport.addEventListener('scroll', () => {
      this.updateScrollbarThumbPosition('vertical');
      this.updateScrollbarThumbPosition('horizontal');
    }, { passive: true });

    // Update entire scrollbar when resizing the viewport or the content
    const resizeObserver = new ResizeObserver(() => {
      for (let orientation of ['vertical', 'horizontal']) {
        this.updateCache(orientation);
        this.updateScrollbarThumbSize(orientation);
        this.updateScrollbarThumbPosition(orientation);
      }
    });
    resizeObserver.observe(this.elements.viewport);
    resizeObserver.observe(this.elements.content);
  }

  scroll(...args) {
    this.elements.viewport.scroll(...args);
  }

  scrollTo(...args) {
    this.elements.viewport.scrollTo(...args);
  }

  scrollBy(...args) {
    this.elements.viewport.scrollBy(...args);
  }

  updateCache(orientation) {
    // Caches as much as possible to avoid useless repaint/reflow
    if (orientation === 'vertical') {
      this.sizes[orientation].viewport = this.elements.viewport.clientHeight;
      this.sizes[orientation].scroll = this.elements.viewport.scrollHeight;
      this.sizes[orientation].scrollbarTrack = this.elements[orientation].scrollbarTrack.clientHeight;
    }
    else {
      this.sizes[orientation].viewport = this.elements.viewport.clientWidth;
      this.sizes[orientation].scroll = this.elements.viewport.scrollWidth;
      this.sizes[orientation].scrollbarTrack = this.elements[orientation].scrollbarTrack.clientWidth;
    }
    this.ratios[orientation] = this.sizes[orientation].scroll / this.sizes[orientation].scrollbarTrack;
  }

  updateScrollbarThumbSize(orientation) {
    if (this.scrollbarSizeAnimationFrame[orientation]) {
      return;
    }
    this.scrollbarSizeAnimationFrame[orientation] = requestAnimationFrame(() => {
      this.scrollbarSizeAnimationFrame[orientation] = null;
      if (this.sizes[orientation].scroll <= this.sizes[orientation].viewport) {
        this.elements[orientation].scrollbar.classList.add('hidden');
        this.sizes[orientation].scrollbarThumb = this.sizes[orientation].scrollbarTrack;
      }
      else {
        this.elements[orientation].scrollbar.classList.remove('hidden');
        this.sizes[orientation].scrollbarThumb = Math.round(this.sizes[orientation].viewport / this.ratios[orientation]);
      }

      if (orientation === 'vertical') {
        this.elements[orientation].scrollbarThumb.style.height = `${this.sizes[orientation].scrollbarThumb}px`;
      }
      else {
        this.elements[orientation].scrollbarThumb.style.width = `${this.sizes[orientation].scrollbarThumb}px`;
      }
    });
  }

  updateScrollbarThumbPosition(orientation) {
    if (this.scrollbarPositionAnimationFrame[orientation]) {
      return;
    }
    this.scrollbarPositionAnimationFrame[orientation] = requestAnimationFrame(() => {
      this.scrollbarPositionAnimationFrame[orientation] = null;
      let scrollBarThumbOffset;
      if (this.sizes[orientation].scroll <= this.sizes[orientation].viewport) {
        this.elements[orientation].scrollbar.classList.add('hidden');
        scrollBarThumbOffset = 0;
      }
      else {
        this.elements[orientation].scrollbar.classList.remove('hidden');
        let scrollOffset = orientation === 'vertical'
          ? this.elements.viewport.scrollTop
          : this.elements.viewport.scrollLeft;
        scrollBarThumbOffset = Math.floor(scrollOffset / this.ratios[orientation]);
      }

      if (orientation === 'vertical') {
        this.elements[orientation].scrollbarThumb.style.transform = `translate3D(0, ${scrollBarThumbOffset}px, 0)`;
      }
      else {
        this.elements[orientation].scrollbarThumb.style.transform = `translate3D(${scrollBarThumbOffset}px, 0, 0)`;
      }
    });
  }
}
window.customElements.define('scrollable-component', ScrollableComponentElement);

var count = 1;

function addFieldForm() {
  count = count + 1;

  var buttonArea = document.getElementById('buttonArea');

  var fieldHeader = document.createElement('h2');
  fieldHeader.setAttribute('class', 'text-center h2text')
  fieldHeader.setAttribute('id', 'field' + count);
  fieldHeader.innerHTML = 'Field Schema ' + count;
  buttonArea.before(fieldHeader);

  var formGroup = document.createElement('div');
  formGroup.setAttribute('class', 'form-group');
  var textInput = document.createElement('input');
  textInput.setAttribute('type', 'text');
  textInput.setAttribute('pattern', '[a-zA-Z]+');
  textInput.setAttribute('required', 'required');
  textInput.setAttribute('name', 'field' + count);
  textInput.setAttribute('placeholder', 'Enter fieldname');
  formGroup.appendChild(textInput);
  var textLabel = document.createElement('label');
  textLabel.setAttribute('class', 'control-label');
  textLabel.setAttribute('for', 'input');
  textLabel.innerHTML = 'Fieldname';
  formGroup.appendChild(textLabel);
  var bar = document.createElement('i');
  bar.setAttribute('class', 'bar');
  formGroup.appendChild(bar);
  var inputError = document.createElement('i');
  inputError.setAttribute('class', 'input-error');
  inputError.innerHTML = 'Please enter fieldname (Example : currentMileage)'
  formGroup.appendChild(inputError);
  buttonArea.before(formGroup);

  var formGroup = document.createElement('div');
  formGroup.setAttribute('class', 'form-group');
  var select = document.createElement('select');
  select.setAttribute('name', 'datatype' + count);
  select.setAttribute('required', 'required');
  formGroup.appendChild(select);
  var option = document.createElement('option');
  option.setAttribute('value', 'character');
  option.innerHTML = 'CharField';
  select.appendChild(option);
  var option = document.createElement('option');
  option.setAttribute('value', 'text');
  option.innerHTML = 'TextField';
  select.appendChild(option);
  var option = document.createElement('option');
  option.setAttribute('value', 'integer');
  option.innerHTML = 'IntegerField';
  select.appendChild(option);
  var option = document.createElement('option');
  option.setAttribute('value', 'float');
  option.innerHTML = 'FloatField';
  select.appendChild(option);
  var option = document.createElement('option');
  option.setAttribute('value', 'boolean');
  option.innerHTML = 'BooleanField';
  select.appendChild(option);
  var option = document.createElement('option');
  option.setAttribute('value', 'date');
  option.innerHTML = 'DateTimeField';
  select.appendChild(option);
  var textLabel = document.createElement('label');
  textLabel.setAttribute('class', 'control-label');
  textLabel.setAttribute('for', 'select');
  textLabel.innerHTML = 'Select datatype';
  formGroup.appendChild(textLabel);
  var bar = document.createElement('i');
  bar.setAttribute('class', 'bar');
  formGroup.appendChild(bar);
  buttonArea.before(formGroup);

  var formGroup = document.createElement('div');
  formGroup.setAttribute('class', 'form-group');
  var textInput = document.createElement('input');
  textInput.setAttribute('type', 'number');
  textInput.setAttribute('min', '0');
  textInput.setAttribute('max', '6000');
  textInput.setAttribute('required', 'required');
  textInput.setAttribute('name', 'maxlen' + count);
  textInput.setAttribute('placeholder', 'Enter maxlength');
  formGroup.appendChild(textInput);
  var textLabel = document.createElement('label');
  textLabel.setAttribute('class', 'control-label');
  textLabel.setAttribute('for', 'input');
  textLabel.innerHTML = 'Maxlength';
  formGroup.appendChild(textLabel);
  var bar = document.createElement('i');
  bar.setAttribute('class', 'bar');
  formGroup.appendChild(bar);
  var inputError = document.createElement('i');
  inputError.setAttribute('class', 'input-error');
  inputError.innerHTML = 'Please enter integer maxlength (0 - 6000)'
  formGroup.appendChild(inputError);
  buttonArea.before(formGroup);

  var formGroup = document.createElement('div');
  formGroup.setAttribute('class', 'form-group');
  var select = document.createElement('select');
  select.setAttribute('name', 'null' + count);
  select.setAttribute('required', 'required');
  formGroup.appendChild(select);
  var option = document.createElement('option');
  option.setAttribute('value', 'False');
  option.innerHTML = 'False';
  select.appendChild(option);
  var option = document.createElement('option');
  option.setAttribute('value', 'True');
  option.innerHTML = 'True';
  select.appendChild(option);
  var textLabel = document.createElement('label');
  textLabel.setAttribute('class', 'control-label');
  textLabel.setAttribute('for', 'select');
  textLabel.innerHTML = 'Choose null or not?';
  formGroup.appendChild(textLabel);
  var bar = document.createElement('i');
  bar.setAttribute('class', 'bar');
  formGroup.appendChild(bar);
  buttonArea.before(formGroup);

  var formGroup = document.createElement('div');
  formGroup.setAttribute('class', 'form-group');
  var select = document.createElement('select');
  select.setAttribute('name', 'unique' + count);
  select.setAttribute('required', 'required');
  formGroup.appendChild(select);
  var option = document.createElement('option');
  option.setAttribute('value', 'False');
  option.innerHTML = 'False';
  select.appendChild(option);
  var option = document.createElement('option');
  option.setAttribute('value', 'True');
  option.innerHTML = 'True';
  select.appendChild(option);
  var textLabel = document.createElement('label');
  textLabel.setAttribute('class', 'control-label');
  textLabel.setAttribute('for', 'select');
  textLabel.innerHTML = 'Choose unique or not?';
  formGroup.appendChild(textLabel);
  var bar = document.createElement('i');
  bar.setAttribute('class', 'bar');
  formGroup.appendChild(bar);
  buttonArea.before(formGroup);

  var scrollAbove = document.getElementById("field" + count);
  scrollAbove.scrollIntoView();
}
