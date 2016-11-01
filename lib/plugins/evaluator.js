'use strict';

// Module dependencies
const Application = require('../Application');
const utils = require('../utils');
const colors = require('colors/safe');

// Constants
const logPrefix = colors.blue(colors.bold('  baiji:evaluator'));

// Evaluator Plugin
module.exports = function evaluatorPlugin(app, options) {
  if (process.env.NODE_ENV === 'production') {
    utils.logWarning('evaluator plugin should not be used in production!');
  }

  options = options || {};
  let warningThreshold = options.warningThreshold || 20;

  function injectEvaluator(defaultName) {
    return function(hook) {
      return function(ctx, next) {
        let startedAt = +new Date();
        return hook(ctx, function() {
          let millis = +new Date() - startedAt;
          let name = (hook.name || defaultName || 'anonymous').replace(/^bound\ /, '');
          let message = `${name} TIME COMSUMPTION: +${millis} ms`;
          if (millis >= warningThreshold) {
            console.log(logPrefix, colors.red(message));
          } else {
            console.log(logPrefix, colors.green(message));
          }
          return next();
        });
      };
    };
  }

  // Hack composedMethods
  Application.prototype.composedMethods = function() {
    let beforeHooks = this.searchHooksByType('before');
    let afterHooks = this.searchHooksByType('after');
    let afterErrorHooks = this.searchHooksByType('afterError');

    return this.allMethods().map((method) => {
      let name = method.fullName();

      let beforeStack = utils.filterHooks(beforeHooks, name);
      let afterStack = utils.filterHooks(afterHooks, name);
      let afterErrorStack = utils.filterHooks(afterErrorHooks, name);

      beforeStack = beforeStack.map(injectEvaluator());
      afterStack = afterStack.map(injectEvaluator());
      afterErrorStack = afterErrorStack.map(injectEvaluator());

      method.fn = injectEvaluator(name)(method.fn);

      method.compose(
        beforeStack,
        afterStack,
        afterErrorStack
      );

      return method;
    });
  };
};