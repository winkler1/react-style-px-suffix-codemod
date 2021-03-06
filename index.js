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

function transformProperties (props, source) {
  props.forEach(p => {
    if (p.type === 'SpreadProperty') {
      transformStyleObject(p.argument, source);
    }
    else {
      const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
      let val = p.value.value;
      if (val === undefined) {
        if (p.value.type === 'UnaryExpression') {
          val = parseInt(`${p.value.operator}${p.value.argument.value}`); 
          if (shouldSuffixIfIntergerValue(key) && typeof val === 'number') {
            p.value.operator = '';
            p.value.argument.value = `${val}px`;
          }  
          return;
        }
      }
      if (shouldSuffixIfIntergerValue(key) && typeof val === 'number') {
        p.value.value = `${val}px`;
      }
    }
  });
};

function transformConditional (o, source) {
  const consequent = o.consequent;
  const alternate = o.alternate;
  if (consequent) {
    if (consequent.type === 'ObjectExpression' && consequent.properties) {
      transformProperties(consequent.properties, source);
    } else if (consequent.type === 'Identifier') {
      transformStyleObject(consequent, source);
    }
  } 
  if (alternate) {
    if (alternate.type === 'ObjectExpression' && alternate.properties) {
      transformProperties(alternate.properties, source);
    } else if (alternate.type === 'Identifier') {
      transformStyleObject(alternate, source);
    }
  } 
}

function transformStyleObject(style, source) {
  const type = style.type;
  if (type === 'Identifier') {
    const varName = style.name;
    source.findVariableDeclarators(varName).forEach(o => {
      let properties;
      const type = o.value.init.type;
      if (type === 'ObjectExpression') {
        properties = o.value.init.properties;
      } else if (type === 'ConditionalExpression') {
        transformConditional(o.value.init, source);
      } else if (type === 'CallExpression' &&  o.value.init.callee.property.name === 'assign') {
        o.value.init.arguments.forEach(arg => transformStyleObject(arg, source));
      }
      if (properties) {
        transformProperties(properties, source);
      }
    }); 
  } else if (type === 'ObjectExpression') {
    const properties = style.properties;
    if (properties) {
      transformProperties(properties);
    }
  } else if (type === 'ConditionalExpression') {
    transformConditional(style, source);
  }
} 

module.exports = function (file, api, options) {
  if (options.ignore) {
    const toIgnore = options.ignore.split(',');
    if (toIgnore.length) {
      itemsToNotSuffixWithPx = itemsToNotSuffixWithPx.concat(toIgnore);
    }
  }
  const printOptions = options.printOptions || {};
  const shift = api.jscodeshift;
  const source = shift(file.source);
  source.find(shift.JSXOpeningElement).forEach(el => {
    const style = getStyle(el.value.attributes);
    if (style) {
      transformStyleObject(style.value.expression, source);
    }
  });
  return source.toSource(printOptions);
}