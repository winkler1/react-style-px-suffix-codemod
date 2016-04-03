'use strict';

let itemsToNotSuffixWithPx = [
  'animationIterationCount',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'fillOpacity',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'stopOpacity',
  'strokeDashoffset',
  'strokeOpacity',
  'strokeWidth',
  'tabSize',
  'widows',
  'zIndex',
  'zoom'
];

const shouldSuffixIfIntergerValue = attr => itemsToNotSuffixWithPx.indexOf(attr) === -1;

const getStyle = attrs => attrs.find(attr => attr.name && attr.name.name === 'style');

const transformProperties = props => {
  props.forEach(p => {
    const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
    const val = p.value.value;
    if (shouldSuffixIfIntergerValue(key) && typeof val === 'number') {
      p.value.value = `${val}px`;
    }
  });
};

module.exports = function (file, api, options) {
  if (options.ignore) {
    const toIgnore = options.ignore.split(',');
    if (toIgnore.length) {
      itemsToNotSuffixWithPx = itemsToNotSuffixWithPx.concat(toIgnore);
    }
  }
  const shift = api.jscodeshift;
  const source = shift(file.source);
  source.find(shift.JSXOpeningElement).forEach(el => {
    const style = getStyle(el.value.attributes);
    if (style) {
      const type = style.value.expression.type;
      if (type === 'Identifier') {
        const varName = style.value.expression.name;
        source.findVariableDeclarators(varName).forEach(o => {
          const properties = o.value.init.properties;
          if (properties) {
            transformProperties(properties);
          }
        }); 
      } else if (type === 'ObjectExpression') {
        const properties = style.value.expression.properties;
        if (properties) {
          transformProperties(properties);
        }
      }
    }
  });
  return source.toSource();
}