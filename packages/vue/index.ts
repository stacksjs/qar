import { barcode } from '@stacksjs/qrx'

export const VueBarcode = {
  render(createElement) {
    return createElement('div', [
      createElement(this.elementTag, {
        style: { display: this.valid ? undefined : 'none' },
        class: ['vue-barcode-element'],
      }),
      createElement('div', {
        style: { display: this.valid ? 'none' : undefined },
      }, this.$slots.default),
    ])
  },
  props: {
    value: [String, Number],
    format: [String],
    width: [String, Number],
    height: [String, Number],
    displayValue: {
      type: [String, Boolean],
      default: true,
    },
    text: [String, Number],
    fontOptions: [String],
    font: [String],
    textAlign: [String],
    textPosition: [String],
    textMargin: [String, Number],
    fontSize: [String, Number],
    background: [String],
    lineColor: [String],
    margin: [String, Number],
    marginTop: [String, Number],
    marginBottom: [String, Number],
    marginLeft: [String, Number],
    marginRight: [String, Number],
    flat: [Boolean],
    ean128: [String, Boolean],
    elementTag: {
      type: String,
      default: 'svg',
      validator(value) {
        return ['canvas', 'svg', 'img'].includes(value)
      },
    },
  },
  mounted() {
    this.$watch('$props', render, { deep: true, immediate: true })
    render.call(this)
  },
  data() {
    return { valid: true }
  },
}

function render() {
  const that = this

  const settings = {
    format: this.format,
    width: this.width,
    height: this.height,
    displayValue: this.displayValue,
    text: this.text,
    fontOptions: this.fontOptions,
    font: this.font,
    textAlign: this.textAlign,
    textPosition: this.textPosition,
    textMargin: this.textMargin,
    fontSize: this.fontSize,
    background: this.background,
    lineColor: this.lineColor,
    margin: this.margin,
    marginTop: this.marginTop,
    marginBottom: this.marginBottom,
    marginLeft: this.marginLeft,
    marginRight: this.marginRight,
    flat: this.flat,
    ean128: this.ean128,
    valid(valid) {
      that.valid = valid
    },
    elementTag: this.elementTag,
  }

  removeUndefinedProps(settings)

  barcode(this.$el.querySelector('.vue-barcode-element'), String(this.value), settings)
}

function removeUndefinedProps(obj) {
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop) && obj[prop] === undefined) {
      delete obj[prop]
    }
  }
}
