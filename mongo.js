(function() {
  var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  define(['dexie-db'], function(Dexie) {
    'use strict';
    var Mongo, analyseQuery, analyseUpdateOptions, analyseUpdates, assign, chooseExecutuionPlan, chooseIndex, comparsionQueryOperatorsImpl, concat, createAdvancedOperatorsMatcher, createAdvancedPropertyUpdater, createCollectionUpdater, createDeleteResult, createInsertResult, createObjectForUpsert, createPlainModifier, createPlainPropertyMatcher, createPlainPropertyUpdater, createQueryOperatorsReducer, createUpdateIterator, createUpdateOperatorsReducer, createUpdateResult, createUpsertModifier, curry2, executionPlans, getMatcherSets, getOperatorImplementation, getOperators, getPlainKeys, getPropertyUpdaters, getQueryIndexedKeys, getQueryOperators, getQueryOperatorsFilters, getQueryPrimaryKey, getQueryValueMatchers, getUpdateOperators, has, hasOwnProperty, isArrayField, isEmptyValue, isPlainValue, last, logicalQueryOperatorsImpl, only, operators, performCollectionUpdate, performDrop, performFind, performInsert, performRemove, propIsEnumerable, shouldUseNative, supportedUpdateOptions, supportedUpsertOperators, toObject, updateOperatorsImpl, valueComparator;
    only = function(obj, keys) {
      obj = obj || new Object;
      if ('string' === typeof keys) {
        keys = keys.split(/ +/);
      }
      return keys.reduce(function(ret, key) {
        if (null === obj[key]) {
          return ret;
        }
        ret[key] = obj[key];
        return ret;
      }, new Object);
    };
    curry2 = function(fn, self) {
      var out;
      out = function() {
        if (arguments.length > 1) {
          return fn.call(self, arguments[0], arguments[1]);
        } else {
          return fn.bind(self, arguments[0]);
        }
      };
      out.uncurry = function() {
        return fn;
      };
      return out;
    };
    hasOwnProperty = Object.prototype.hasOwnProperty;
    propIsEnumerable = Object.prototype.propertyIsEnumerable;
    toObject = function(val) {
      if (val === null || val === void 0) {
        throw new TypeError('Object.assign cannot be called with null or undefined');
      } else {
        return Object(val);
      }
    };
    shouldUseNative = function() {
      var error, i, j, order2, test1, test2, test3;
      try {
        if (!Object.assign) {
          return false;
        }
        test1 = new String('abc');
        test1[5] = 'de';
        if (Object.getOwnPropertyNames(test1)[0] === '5') {
          return false;
        }
        test2 = Object;
        for (i = j = 0; j <= 9; i = ++j) {
          test2['_' + String.fromCharCode(i)] = i;
        }
        order2 = Object.getOwnPropertyNames(test2).map(function(n) {
          return test2[n];
        });
        if (order2.join('') !== '0123456789') {
          return false;
        }
        test3 = Object;
        'abcdefghijklmnopqrst'.split('').forEach(function(letter) {
          return test3[letter] = letter;
        });
        if (Object.keys(Object.assign({}, test3)).join('') !== 'abcdefghijklmnopqrst') {
          return false;
        }
        return true;
      } catch (error1) {
        error = error1;
        return false;
      }
    };
    assign = shouldUseNative ? Object.assign : function(target, source) {
      var from, i, j, k, key, l, len, ref, ref1, s, symbols, to;
      to = toObject(target);
      for (s = j = 1, ref = arguments.length - 1; 1 <= ref ? j <= ref : j >= ref; s = 1 <= ref ? ++j : --j) {
        from = Object(arguments[s]);
        for (k = 0, len = from.length; k < len; k++) {
          key = from[k];
          if (hasOwnProperty.call(from, key)) {
            to[key] = from[key];
          }
        }
        if (Object.getOwnPropertySymbols) {
          symbols = Object.getOwnPropertySymbols(from);
          for (i = l = 0, ref1 = symbols.length - 1; 0 <= ref1 ? l <= ref1 : l >= ref1; i = 0 <= ref1 ? ++l : --l) {
            if (propIsEnumerable.call(from, symbols[i])) {
              to[symbols[i]] = from[symbols[i]];
            }
          }
        }
      }
      return to;
    };
    last = function(list, value) {
      return list.concat(value);
    };
    concat = curry2(last);
    valueComparator = function(prev, next, direction) {
      if (direction === 1) {
        return prev > next;
      } else {
        return prev < next;
      }
    };
    has = function(obj, key) {
      return obj.hasOwnProperty(key);
    };
    isArrayField = function(value, key) {
      var hasField, isArray;
      hasField = has(value, key);
      isArray = Array.isArray(value[key]);
      if (hasField && !isArray) {
        throw new Error('You can\'t use array update operator on non-array field');
      }
      return hasField;
    };
    isEmptyValue = function(value) {
      var isFalsy, isObj;
      isObj = typeof value === 'object' && value !== null;
      isFalsy = !(isObj && value);
      return isFalsy || Object.keys(value).length === 0;
    };
    isPlainValue = function(value) {
      var type;
      type = typeof value;
      return type === 'number' || type === 'string' || type === 'boolean';
    };
    comparsionQueryOperatorsImpl = {
      $eq: function(key, value) {
        return function(item) {
          return has(item, key) && item[key] === value;
        };
      },
      $gt: function(key, value) {
        return function(item) {
          return has(item, key) && item[key] > value;
        };
      },
      $gte: function(key, value) {
        return function(item) {
          return has(item, key) && item[key] >= value;
        };
      },
      $lt: function(key, value) {
        return function(item) {
          return has(item, key) && item[key] < value;
        };
      },
      $lte: function(key, value) {
        return function(item) {
          return has(item, key) && item[key] <= value;
        };
      },
      $ne: function(key, value) {
        return function(item) {
          return has(item, key) && item[key] !== value;
        };
      },
      $in: function(key, value) {
        return function(item) {
          return has(item, key) && value.indexOf(item[key]) > -1;
        };
      },
      $nin: function(key, value) {
        return function(item) {
          return has(item, key) && value.indexOf(item[key]) === -1;
        };
      },
      $exists: function(key, value) {
        return function(item) {
          return has(item, key) === value;
        };
      },
      $all: function(key, value) {
        return function(item) {
          return has(item, key) && value.every(function(valueItem) {
            return item[key].indexOf(valueItem) > -1;
          });
        };
      },
      $size: function(key, value) {
        return function(item) {
          return has(item, key) && item[key].length === value;
        };
      },
      $elemMatch: function(key, value) {
        var matchers;
        matchers = getQueryValueMatchers(key, value);
        return function(item) {
          return has(item, key) && item[key].some(function(element) {
            var dummy;
            dummy = new Object;
            dummy[key] = element;
            return matchers.every(function(matcher) {
              return matcher(dummy);
            });
          });
        };
      },
      $not: function(key, value) {
        var matchers;
        matchers = getQueryValueMatchers(key, value);
        return function(item) {
          return !has(item, key) || matchers.every(function(matcher) {
            return !matcher(item);
          });
        };
      }
    };
    logicalQueryOperatorsImpl = {
      $and: function(key, value) {
        var matchers;
        matchers = value.map(getMatcherSets).reduce(concat);
        return function(item) {
          return matchers.every(function(matcher) {
            return matcher(item);
          });
        };
      },
      $or: function(key, value) {
        var matchersSets;
        matchersSets = value.map(getMatcherSets);
        return function(item) {
          return matchersSets.some(function(matchers) {
            return matchers.every(function(matcher) {
              return matcher(item);
            });
          });
        };
      },
      $nor: function(key, value) {
        var matcher;
        matcher = this.$and(key, value);
        return function(item) {
          return !matcher(item);
        };
      }
    };
    updateOperatorsImpl = {
      $inc: function(_null, increments) {
        return createUpdateIterator(increments, function(key, item) {
          if (has(item, key)) {
            item[key] += increments[key];
          }
        });
      },
      $mul: function(_null, muls) {
        return createUpdateIterator(muls, function(key, item) {
          if (has(item, key)) {
            item[key] *= muls[key];
          }
        });
      },
      $rename: function(_null, renames) {
        return createUpdateIterator(renames, function(key, item) {
          var oldValue;
          oldValue = item[key];
          delete item[key];
          item[renames[key]] = oldValue;
        });
      },
      $set: function(_null, sets) {
        return createUpdateIterator(sets, function(key, item) {
          item[key] = sets[key];
        });
      },
      $unset: function(_null, unsets) {
        return createUpdateIterator(unsets, function(key, item) {
          delete item[key];
        });
      },
      $min: function(_null, minimums) {
        return createUpdateIterator(minimums, function(key, item) {
          item[key] = Math.min(item[key], minimums[key]);
        });
      },
      $max: function(_null, maximums) {
        return createUpdateIterator(maximums, function(key, item) {
          item[key] = Math.max(item[key], maximums[key]);
        });
      },
      $addToSet: function(_null, additions) {
        return createUpdateIterator(additions, function(key, item) {
          if (!isArrayField(item, key)) {
            item[key] = [additions[key]];
          } else if (item[key].indexOf(additions[key] === -1)) {
            item[key].push(additions[key]);
          }
        });
      },
      $pop: function(_null, pops) {
        return createUpdateIterator(pops, function(key, item) {
          isArrayField(item, key);
          if (pops[key] === 1) {
            item[key].pop;
          } else if (pops[key] === -1) {
            item[key].shift;
          }
        });
      },
      $push: function(_null, pushes) {
        return createUpdateIterator(pushes, function(key, item) {
          if (!isArrayField(item, key)) {
            item[key] = [pushes[key]];
          } else {
            item[key].push(pushes[key]);
          }
        });
      },
      $pullAll: function(_null, pulls) {
        return createUpdateIterator(pulls, function(key, item) {
          var pullValue;
          isArrayField(item, key);
          pullValue = pulls[key];
          item[key] = item[key].filter(function(fieldItem) {
            return pullValue.indexOf(fieldItem) === -1;
          });
        });
      },
      $pull: function(_null, pulls) {
        return createUpdateIterator(pulls, function(key, item) {
          var matchers, plainValue, pullValue;
          isArrayField(item, key);
          pullValue = pulls[key];
          plainValue = isPlainValue(pullValue);
          if (plainValue) {
            return item[key] = item[key].filter(function(fieldItem) {
              return fieldItem !== pullValue;
            });
          } else {
            matchers = getQueryValueMatchers(key, pullValue);
            return item[key] = item[key].filter(function(fieldItem) {
              var dummy;
              dummy = new Object;
              dummy[key] = fieldItem;
              return !matchers.some(function(matcher) {
                return matcher(dummy);
              });
            });
          }
        });
      },
      $slice: function(_null, slices) {
        return createUpdateIterator(slices, function(key, item) {
          var sliceValue, slicesKeys;
          isArrayField(item, key);
          sliceValue = slices[key];
          if (isPlainValue(sliceValue)) {
            item[key] = arraySlice(item[key], sliceValue);
          } else {
            slicesKeys = Object.keys(sliceValue);
            item[key] = item[key].map(function(fieldItem) {
              return slicesKeys.reduce(function(obj, slicesKey) {
                obj[slicesKey] = arraySlice(obj[slicesKey], sliceValue[slicesKey]);
                return obj;
              }, fieldItem);
            });
          }
        });
      },
      $sort: function(_null, sortings) {
        return createUpdateIterator(sortings, function(key, item) {
          var res, sortValue;
          isArrayField(item, key);
          sortValue = sortings[key];
          if (isPlainValue(sortValue)) {
            item[key] = item[key].sort(function(prev, next) {
              return valueComparator(prev, next, sortValue);
            });
          } else {
            res = item[key].slice;
            item[key] = Object.keys(sortValue).reduce(function(array, sortingValueKey) {
              var direction;
              direction = sortValue[sortingValueKey];
              return res.sort(function(prev, next) {
                var nextValue, prevValue;
                prevValue = prev[sortingValueKey];
                nextValue = next[sortingValueKey];
                return valueComparator(prevValue, nextValue, direction);
              });
            }, item[key]);
          }
        });
      }
    };
    operators = {
      query: Object.keys(comparsionQueryOperatorsImpl),
      queryLogical: Object.keys(logicalQueryOperatorsImpl),
      update: Object.keys(updateOperatorsImpl)
    };
    supportedUpdateOptions = ['upsert'];
    supportedUpsertOperators = ['$set', '$addToSet', '$push'];
    getMatcherSets = function(operator) {
      return Object.keys(operator).map((function(operatorKey) {
        return getQueryValueMatchers(operatorKey, operator[operatorKey]);
      }).reduce(concat));
    };
    getQueryValueMatchers = function(itemKey, queryOperators) {
      return Object.keys(queryOperators).map(function(operatorKey) {
        return getOperatorImplementation({
          key: itemKey,
          type: operatorKey,
          value: queryOperators[operatorKey]
        });
      });
    };
    createPlainPropertyMatcher = function(query, objectKeys) {
      var keys;
      keys = objectKeys || Object.keys(query);
      return function(item) {
        return keys.every(function(key) {
          return has(item, key) && item[key] === query[key];
        });
      };
    };
    createPlainPropertyUpdater = function(update, objectKeys) {
      var keys;
      keys = objectKeys || Object.keys(update);
      return function(item) {
        return keys.forEach(function(key) {
          if (has(item, key)) {
            item[key] = update[key];
          }
        });
      };
    };
    createUpdateIterator = function(updates, iteratorCallback) {
      var keys;
      keys = Object.keys(updates);
      return function(item) {
        return keys.forEach(function(key) {
          return iteratorCallback(key, item);
        });
      };
    };
    createObjectForUpsert = function(query, update) {
      var objectFromQuery, objectFromUpdate, plainQueryKeys;
      plainQueryKeys = Object.keys(query).filter(function(key) {
        var hasLogicalOperatorKey, hasPlainOperatorKey;
        hasPlainOperatorKey = has(comparsionQueryOperatorsImpl, key);
        hasLogicalOperatorKey = has(logicalQueryOperatorsImpl, key);
        return !(hasPlainOperatorKey || hasLogicalOperatorKey);
      });
      objectFromQuery = only(query, plainQueryKeys);
      objectFromUpdate = supportedUpsertOperators.reduce(function(obj, operatorKey) {
        var updateItem;
        updateItem = update[operatorKey];
        return assign(obj, updateItem, Object);
      });
      return assign(objectFromQuery, objectFromUpdate);
    };
    chooseIndex = function(query, queryAnalysis) {
      var numericFieldIndex, plainFieldIndex, uniqueFieldIndex;
      uniqueFieldIndex = -1;
      numericFieldIndex = -1;
      plainFieldIndex = -1;
      queryAnalysis.indexedKeys.forEach(function(indexedField, index) {
        if (indexedField.unique) {
          uniqueFieldIndex = index;
        } else if (typeof indexedField.value === 'number') {
          numericFieldIndex = index;
        } else if (indexedField.plain) {
          plainFieldIndex = index;
        }
      });
      if (uniqueFieldIndex > -1) {
        return queryAnalysis.indexedKeys[uniqueFieldIndex];
      }
      if (numericFieldIndex > -1) {
        return queryAnalysis.indexedKeys[numericFieldIndex];
      }
      return queryAnalysis.indexedKeys[plainFieldIndex];
    };
    getQueryOperatorsFilters = function(queryAnalysis) {
      return queryAnalysis.queryOperators.advanced.map(function(operator) {
        return operator.operators.map(function(primitiveOperator) {
          return getOperatorImplementation({
            type: primitiveOperator,
            key: operator.key,
            value: operator.value[primitiveOperator]
          });
        });
      }).reduce(concat);
    };
    getPropertyUpdaters = function(updateAnalysis) {
      return updateAnalysis.updateOperators.advanced.map(function(operator) {
        return getOperatorImplementation({
          type: operator.key,
          key: null,
          value: operator.value
        });
      });
    };
    createAdvancedOperatorsMatcher = function(queryAnalysis) {
      var operatorsFilters;
      operatorsFilters = getQueryOperatorsFilters(queryAnalysis);
      return function(item) {
        return operatorsFilters.every(function(filter) {
          return filter(item);
        });
      };
    };
    createAdvancedPropertyUpdater = function(updateAnalysis) {
      var updaters;
      updaters = getPropertyUpdaters(updateAnalysis);
      return function(item) {
        return updaters.forEach(function(updater) {
          return updater(item);
        });
      };
    };
    getPlainKeys = function(queryAnalysis) {
      return queryAnalysis.queryOperators.plain.map(function(op) {
        return op.key;
      });
    };
    executionPlans = {
      primaryKey: function(query, queryAnalysis, table) {
        var advancedOperatorsMatcher, collection, plainPropsMatcher, primaryKeyName, primaryQueryValue;
        primaryKeyName = queryAnalysis.primaryKey.key;
        primaryQueryValue = queryAnalysis.primaryKey.value;
        collection = table.where(primaryKeyName).equals(primaryQueryValue);
        if (queryAnalysis.queryOperators.plain.length > 0) {
          plainPropsMatcher = createPlainPropertyMatcher(query, getPlainKeys(queryAnalysis));
          collection.and(plainPropsMatcher);
        }
        if (queryAnalysis.queryOperators.advanced.length > 0) {
          advancedOperatorsMatcher = createAdvancedOperatorsMatcher(queryAnalysis);
          collection.and(advancedOperatorsMatcher);
        }
        return collection;
      },
      indexedProp: function(query, queryAnalysis, table) {
        var advancedOperatorsMatcher, collection, index, plainPropsMatcher;
        index = chooseIndex(query, queryAnalysis);
        if (index && index.plain) {
          collection = table.where(index.key).equals(index.value);
        } else {
          collection = table.toCollection.apply(table, []);
        }
        if (queryAnalysis.queryOperators.plain.length > 0) {
          plainPropsMatcher = createPlainPropertyMatcher(query, getPlainKeys(queryAnalysis));
          collection.and(plainPropsMatcher);
        }
        if (queryAnalysis.queryOperators.advanced.length > 0) {
          advancedOperatorsMatcher = createAdvancedOperatorsMatcher(queryAnalysis);
          collection.and(advancedOperatorsMatcher);
        }
        return collection;
      },
      fullScan: function(query, queryAnalysis, table) {
        var advancedOperatorsMatcher, collection, plainPropsMatcher;
        collection = table.toCollection.apply(table, []);
        if (queryAnalysis.queryOperators.plain.length > 0) {
          plainPropsMatcher = createPlainPropertyMatcher(query, getPlainKeys(queryAnalysis));
          collection.and(plainPropsMatcher);
        }
        if (queryAnalysis.queryOperators.advanced.length > 0) {
          advancedOperatorsMatcher = createAdvancedOperatorsMatcher(queryAnalysis);
          collection.and(advancedOperatorsMatcher);
        }
        return collection;
      }
    };
    createCollectionUpdater = function(update, updateAnalysis) {
      var advancedUpdate, plainUpdate;
      plainUpdate = updateAnalysis.updateOperators.plain.length > 0;
      advancedUpdate = updateAnalysis.updateOperators.advanced.length > 0;
      if (plainUpdate && advancedUpdate) {
        return;
      }
      if (plainUpdate) {
        createPlainPropertyUpdater(update, updateAnalysis.keys);
      }
      if (advancedUpdate) {
        return createAdvancedPropertyUpdater(updateAnalysis);
      }
    };
    createInsertResult = function(insertedCount, options) {
      return {
        insertedCount: 1,
        insertedId: options.id,
        ops: [options.item],
        result: {
          ok: 1,
          n: 1
        }
      };
    };
    createUpdateResult = function(updateCount, options) {
      var isUpsert, modified, upserted;
      isUpsert = options && options.isUpsert === true;
      modified = isUpsert ? 0 : updateCount;
      upserted = isUpsert ? 1 : 0;
      return {
        result: {
          ok: 1,
          nModified: modified
        },
        modifiedCount: modified,
        upsertedCount: upserted,
        upsertedId: isUpsert ? options.id : null
      };
    };
    createDeleteResult = function(deletedCount) {
      return {
        result: {
          ok: 1,
          n: deletedCount
        },
        deletedCount: deletedCount
      };
    };
    createUpsertModifier = function(table, query, update) {
      return new Dexie.Promise(function(resolve) {
        return table.update(query, update).then(function(result) {
          var newItem;
          if (result.modifiedCount === 0) {
            newItem = createObjectForUpsert(query, update);
            return table.insert(newItem);
          }
          return Dexie.Promise.resolve(result);
        }).then(function(result) {
          var finalResult;
          finalResult = result;
          if (typeof result.insertedId === 'number') {
            finalResult = createUpdateResult(1, {
              isUpsert: true,
              id: result.insertedId
            });
          }
          return resolve(finalResult);
        });
      });
    };
    createPlainModifier = function(table, query, update) {
      var updateAnalysis, updater;
      updateAnalysis = analyseUpdates(update);
      updater = createCollectionUpdater(update, updateAnalysis);
      return table.find(query).modify(updater).then(function(updatesCount) {
        return createUpdateResult(updatesCount, null);
      });
    };
    getOperatorImplementation = function(operator) {
      var operatorsImpl;
      if (operators.query.indexOf(operator.type) > -1) {
        operatorsImpl = comparsionQueryOperatorsImpl;
      } else if (operators.queryLogical.indexOf(operator.type) > -1) {
        operatorsImpl = logicalQueryOperatorsImpl;
      } else if (operators.update.indexOf(operator.type) > -1) {
        operatorsImpl = updateOperatorsImpl;
      }
      return operatorsImpl[operator.type](operator.key, operator.value);
    };
    getOperators = function(objectKind, keys, reducerMaker) {
      return keys.reduce(reducerMaker(objectKind, keys), {
        plain: [],
        advanced: []
      });
    };
    createQueryOperatorsReducer = function(query) {
      return function(operatorsKinds, queryKey) {
        var logicalOperator, plainValue, queryValue, value;
        queryValue = query[queryKey];
        plainValue = isPlainValue(queryValue);
        logicalOperator = operators.queryLogical.indexOf(queryKey) > -1;
        if (plainValue) {
          operatorsKinds.plain.push({
            key: queryKey,
            value: queryValue,
            plain: plainValue
          });
        } else if (logicalOperator) {
          value = new Object;
          value[queryKey] = queryValue;
          operatorsKinds.advanced.push({
            key: queryKey,
            value: value,
            plain: plainValue,
            operators: [queryKey]
          });
        } else {
          operatorsKinds.advanced.push({
            key: queryKey,
            value: queryValue,
            plain: plainValue,
            operators: Object.keys(queryValue).filter(function(operatorKey) {
              return operators.query.indexOf(operatorKey) > -1;
            })
          });
        }
        return operatorsKinds;
      };
    };
    createUpdateOperatorsReducer = function(update) {
      return function(updateKinds, updateKey) {
        var plainValue, updateValue;
        updateValue = update[updateKey];
        plainValue = isPlainValue(updateValue);
        if (plainValue) {
          updateKinds.plain.push({
            key: updateKey,
            value: updateValue,
            plain: plainValue
          });
        } else {
          updateKinds.advanced.push({
            key: updateKey,
            value: updateValue,
            plain: plainValue
          });
        }
        return updateKinds;
      };
    };
    getQueryOperators = function(query, keys) {
      return getOperators(query, keys, createQueryOperatorsReducer);
    };
    getUpdateOperators = function(update, keys) {
      return getOperators(update, keys, createUpdateOperatorsReducer);
    };
    getQueryPrimaryKey = function(query, schema) {
      var hasPrimaryKey, keyName, keyType, keyValue;
      keyName = schema.primKey.keyPath;
      keyValue = query[keyName];
      keyType = typeof keyValue;
      hasPrimaryKey = keyType === 'number' || keyType === 'string';
      if (hasPrimaryKey) {
        return {
          key: keyName,
          value: keyValue
        };
      } else {
        return {
          key: false
        };
      }
    };
    getQueryIndexedKeys = function(query, keys, schema) {
      return schema.indexes.filter(function(indexSpec) {
        return keys.indexOf(indexSpec.keyPath) > -1;
      }).map(function(indexSpec) {
        var key;
        key = indexSpec.keyPath;
        return {
          key: key,
          value: query[key],
          unique: indexSpec.unique,
          plain: isPlainValue(query[key])
        };
      });
    };
    analyseQuery = function(query, schema) {
      var keys;
      keys = Object.keys(query);
      return {
        keys: keys,
        queryOperators: getQueryOperators(query, keys),
        primaryKey: getQueryPrimaryKey(query, schema),
        indexedKeys: getQueryIndexedKeys(query, keys, schema)
      };
    };
    analyseUpdates = function(update) {
      var keys;
      keys = Object.keys(update);
      return {
        keys: keys,
        updateOperators: getUpdateOperators(update, keys)
      };
    };
    analyseUpdateOptions = function(options) {
      if (isEmptyValue(options)) {
        return new Object;
      }
      return only(options, supportedUpdateOptions);
    };
    chooseExecutuionPlan = function(query, schema) {
      var plan, queryAnalysis;
      queryAnalysis = analyseQuery(query, schema);
      if (queryAnalysis.primaryKey.key) {
        plan = 'primaryKey';
      } else if (queryAnalysis.indexedKeys.length > 0) {
        plan = 'indexedProp';
      } else {
        plan = 'fullScan';
      }
      return {
        queryAnalysis: queryAnalysis,
        execute: executionPlans[plan]
      };
    };
    performCollectionUpdate = function(table, query, update, options) {
      var updateModifier;
      updateModifier = options.upsert === true ? createUpsertModifier : createPlainModifier;
      return updateModifier(table, query, update);
    };
    performFind = function(table, query) {
      var executionPlan;
      if (isEmptyValue(query)) {
        return table.toCollection.apply(table, []);
      }
      executionPlan = chooseExecutuionPlan(query, table.schema);
      return executionPlan.execute(query, executionPlan.queryAnalysis, table);
    };
    performInsert = function(table, item) {
      var idKey;
      idKey = table.schema.primKey.keyPath;
      return table.add(item).then(function(id) {
        var newObj;
        newObj = only(item, Object.keys(item));
        newObj[idKey] = id;
        return createInsertResult(1, {
          item: item,
          id: id
        });
      });
    };
    performRemove = function(table, query) {
      return performFind(table, query)["delete"]().then(createDeleteResult);
    };
    performDrop = function(table) {
      return table.toCollection()["delete"]().then(createDeleteResult);
    };
    return Mongo = (function(superClass) {
      extend(Mongo, superClass);

      function Mongo(name) {
        Mongo.__super__.constructor.call(this, name);
        this.WriteableTable = this.WriteableTable ? this.WriteableTable : this.Table;
        this.collection = function(collectionName) {
          return this.table(collectionName);
        };
        this.Table.prototype.count = function(query) {
          var collection, emptyQuery;
          emptyQuery = isEmptyValue(query);
          collection = emptyQuery ? this.toCollection : performFind(this, query);
          return collection.count;
        };
        this.Table.prototype.find = function(query) {
          return performFind(this, query);
        };
        this.Table.prototype.findOne = function(query) {
          return performFind(this, query).first;
        };
        this.Table.prototype.insert = function(item) {
          return performInsert(this, item);
        };
        this.Table.prototype.remove = function(query) {
          return performRemove(this, query);
        };
        this.Table.prototype.drop = function() {
          return performDrop(this);
        };
        this.WriteableTable.prototype.update = function(query, update, options) {
          var processedOptions;
          processedOptions = analyseUpdateOptions(options);
          return performCollectionUpdate(this, query, update, processedOptions);
        };
      }

      return Mongo;

    })(Dexie);
  });

}).call(this);
