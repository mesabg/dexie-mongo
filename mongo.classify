# Mongo Class
define [
	'dexie-db'
], (Dexie) ->
	'use strict'
	# General Functions
	only = (obj, keys) ->
		obj = obj || new Object
		if 'string' == typeof keys then keys = keys.split(/ +/)
		return keys.reduce (ret, key) ->
			if null == obj[key] then return ret
			ret[key] = obj[key];
			return ret;
		, new Object

	curry2 = (fn, self) ->
		out = () -> if arguments.length > 1 then fn.call(self, arguments[0], arguments[1]) else fn.bind(self, arguments[0])
		out.uncurry = () -> fn
		return out

	hasOwnProperty = Object.prototype.hasOwnProperty;
	propIsEnumerable = Object.prototype.propertyIsEnumerable;
	toObject = (val) -> if val == null || val == undefined then throw new TypeError('Object.assign cannot be called with null or undefined') else return Object(val)
	shouldUseNative = () ->
		try 
			if !Object.assign then return false
			test1 = new String('abc')
			test1[5] = 'de'
			if Object.getOwnPropertyNames(test1)[0] == '5' then return false
			test2 = Object
			for i in [0..9] 
				test2['_' + String.fromCharCode(i)] = i
			order2 = Object.getOwnPropertyNames(test2).map (n) -> test2[n]
			if order2.join('') != '0123456789' then return false
			test3 = Object
			'abcdefghijklmnopqrst'.split('').forEach (letter) -> test3[letter] = letter
			if Object.keys(Object.assign({}, test3)).join('') != 'abcdefghijklmnopqrst' then return false
			return true
		catch error
			return false

	assign = if shouldUseNative then Object.assign else (target, source) ->
		to = toObject target
		for s in [1..arguments.length-1]
			from = Object arguments[s]
			for key in from
				if hasOwnProperty.call(from, key) then to[key] = from[key]
			if Object.getOwnPropertySymbols
				symbols = Object.getOwnPropertySymbols from
				for i in [0..symbols.length-1]
					if propIsEnumerable.call(from, symbols[i]) then to[symbols[i]] = from[symbols[i]]
		return to

	last = (list, value) -> list.concat value
	concat = curry2 last

	valueComparator = (prev, next, direction) -> if direction == 1 then prev > next else prev < next
	has = (obj, key) -> obj.hasOwnProperty key
	isArrayField = (value, key) ->
		hasField = has(value, key)
		isArray = Array.isArray(value[key])
		if hasField && !isArray then throw new Error('You can\'t use array update operator on non-array field')
		return hasField;
	isEmptyValue = (value) ->
		isObj = typeof value == 'object' && value != null
		isFalsy = !(isObj && value)
		return isFalsy || Object.keys(value).length == 0
	isPlainValue = (value) ->
		type = typeof value;
		return type == 'number' || type == 'string' || type == 'boolean'

	# Comparsion Query Operators Class
	comparsionQueryOperatorsImpl =
		$eq: (key, value) -> (item) -> has(item, key) && item[key] == value
		$gt: (key, value) -> (item) -> has(item, key) && item[key] > value
		$gte: (key, value) -> (item) -> has(item, key) && item[key] >= value
		$lt: (key, value) -> (item) -> has(item, key) && item[key] < value
		$lte: (key, value) -> (item) -> has(item, key) && item[key] <= value
		$ne: (key, value) -> (item) -> has(item, key) && item[key] != value
		$in: (key, value) -> (item) -> has(item, key) && value.indexOf(item[key]) > -1
		$nin: (key, value) -> (item) -> has(item, key) && value.indexOf(item[key]) == -1
		$exists: (key, value) -> (item) -> has(item, key) == value
		$all: (key, value) -> (item) -> has(item, key) && value.every (valueItem) -> item[key].indexOf(valueItem) > -1
		$size: (key, value) -> (item) -> has(item, key) && item[key].length == value
		$elemMatch: (key, value) ->
			matchers = getQueryValueMatchers key, value
			return (item) -> has(item, key) && item[key].some (element) ->
				dummy = new Object
				dummy[key] = element;
				return matchers.every (matcher) -> matcher(dummy);
		$not: (key, value) ->
			matchers = getQueryValueMatchers(key, value);
			return (item) -> !has(item, key) || matchers.every (matcher) -> !matcher(item);

	# Logical Query Operators Class
	logicalQueryOperatorsImpl =
		$and: (key, value) ->
			matchers = value.map(getMatcherSets).reduce(concat)
			return (item) -> matchers.every (matcher) -> matcher(item)
		$or: (key, value) ->
			matchersSets = value.map(getMatcherSets)
			return (item) -> matchersSets.some (matchers) -> matchers.every (matcher) -> matcher(item)
		$nor: (key, value) ->
			matcher = this.$and(key, value)
			return (item) -> !matcher(item)

	# Update Operators Class
	updateOperatorsImpl =
		$inc: (_null, increments) -> createUpdateIterator increments, (key, item) ->
			if has(item, key) then item[key] += increments[key]
			return
		$mul: (_null, muls) -> createUpdateIterator muls, (key, item) ->
			if has(item, key) then item[key] *= muls[key]
			return
		$rename: (_null, renames) -> createUpdateIterator renames, (key, item) ->
			oldValue = item[key]
			delete item[key]
			item[renames[key]] = oldValue
			return
		$set: (_null, sets) -> createUpdateIterator sets, (key, item) ->
			item[key] = sets[key]
			return
		$unset: (_null, unsets) -> createUpdateIterator unsets, (key, item) ->
			delete item[key]
			return
		$min: (_null, minimums) -> createUpdateIterator minimums, (key, item) ->
			item[key] = Math.min(item[key], minimums[key])
			return
		$max: (_null, maximums) -> createUpdateIterator maximums, (key, item) ->
			item[key] = Math.max(item[key], maximums[key])
			return
		$addToSet: (_null, additions) -> createUpdateIterator additions, (key, item) ->
			if !isArrayField(item, key)
				item[key] = [additions[key]]
			else if item[key].indexOf(additions[key] == -1)
				item[key].push additions[key]
			return
		$pop: (_null, pops) -> createUpdateIterator pops, (key, item) ->
			isArrayField(item, key)
			if pops[key] == 1
				item[key].pop
			else if pops[key] == -1
				item[key].shift
			return
		$push: (_null, pushes) -> createUpdateIterator pushes, (key, item) ->
			if !isArrayField item, key
				item[key] = [pushes[key]]
			else
				item[key].push pushes[key]
			return
		$pullAll: (_null, pulls) -> createUpdateIterator pulls, (key, item) ->
			isArrayField item, key
			pullValue = pulls[key];
			item[key] = item[key].filter (fieldItem) -> pullValue.indexOf(fieldItem) == -1
			return
		$pull: (_null, pulls) -> createUpdateIterator pulls, (key, item) ->
			isArrayField item, key
			pullValue = pulls[key]
			plainValue = isPlainValue pullValue
			if plainValue
				item[key] = item[key].filter (fieldItem) -> fieldItem != pullValue
			else
				matchers = getQueryValueMatchers key, pullValue
				item[key] = item[key].filter (fieldItem) ->
					dummy = new Object
					dummy[key] = fieldItem
					return !matchers.some (matcher) -> matcher(dummy)
		# $each: () -> return 
		$slice: (_null, slices) -> createUpdateIterator slices, (key, item) ->
			isArrayField item, key
			sliceValue = slices[key]
			if isPlainValue(sliceValue) 
				item[key] = arraySlice item[key], sliceValue
			else
				slicesKeys = Object.keys sliceValue
				item[key] = item[key].map (fieldItem) -> 
					slicesKeys.reduce (obj, slicesKey) ->
						obj[slicesKey] = arraySlice obj[slicesKey], sliceValue[slicesKey]
						return obj
					, fieldItem
			return
		$sort: (_null, sortings) -> createUpdateIterator sortings, (key, item) ->
			isArrayField item, key
			sortValue = sortings[key]
			if isPlainValue(sortValue)
				item[key] = item[key].sort (prev, next) -> valueComparator prev, next, sortValue
			else
				res = item[key].slice
				item[key] = Object.keys(sortValue).reduce (array, sortingValueKey) ->
					direction = sortValue[sortingValueKey]
					return res.sort (prev, next) ->
						prevValue = prev[sortingValueKey]
						nextValue = next[sortingValueKey]
						return valueComparator prevValue, nextValue, direction
				, item[key]
			return

	# Operators Class 
	operators =
		query: Object.keys comparsionQueryOperatorsImpl
		queryLogical: Object.keys logicalQueryOperatorsImpl
		update: Object.keys updateOperatorsImpl

	# Supported Options
	supportedUpdateOptions = ['upsert']
	supportedUpsertOperators = ['$set', '$addToSet', '$push']

	# Special Functions
	getMatcherSets = (operator) -> Object.keys(operator).map ((operatorKey) -> getQueryValueMatchers operatorKey, operator[operatorKey]).reduce(concat)
	getQueryValueMatchers = (itemKey, queryOperators) -> Object.keys(queryOperators).map (operatorKey) -> getOperatorImplementation { key: itemKey, type: operatorKey, value: queryOperators[operatorKey] }
	createPlainPropertyMatcher = (query, objectKeys) ->
		keys = objectKeys || Object.keys(query)
		return (item) -> keys.every (key) -> has(item, key) && item[key] == query[key]
	createPlainPropertyUpdater = (update, objectKeys) ->
		keys = objectKeys || Object.keys(update);
		return (item) -> keys.forEach (key) ->
			if has(item, key)
				item[key] = update[key];
			return
	createUpdateIterator = (updates, iteratorCallback) ->
		keys = Object.keys(updates)
		return (item) -> keys.forEach (key) -> iteratorCallback key, item
	createObjectForUpsert = (query, update) ->
		plainQueryKeys = Object.keys(query).filter (key) ->
			hasPlainOperatorKey = has comparsionQueryOperatorsImpl, key
			hasLogicalOperatorKey = has logicalQueryOperatorsImpl, key
			return !(hasPlainOperatorKey || hasLogicalOperatorKey)
		objectFromQuery = only query, plainQueryKeys
		objectFromUpdate = supportedUpsertOperators.reduce (obj, operatorKey) ->
			updateItem = update[operatorKey]
			return assign obj, updateItem
			, Object
		return assign objectFromQuery, objectFromUpdate
	chooseIndex = (query, queryAnalysis) ->
		uniqueFieldIndex = -1
		numericFieldIndex = -1
		plainFieldIndex = -1
		queryAnalysis.indexedKeys.forEach (indexedField, index) ->
			if indexedField.unique
				uniqueFieldIndex = index
			else if typeof indexedField.value == 'number'
				numericFieldIndex = index
			else if indexedField.plain
				plainFieldIndex = index
			return
		if uniqueFieldIndex > -1
			return queryAnalysis.indexedKeys[uniqueFieldIndex]
		if numericFieldIndex > -1
			return queryAnalysis.indexedKeys[numericFieldIndex]
		return queryAnalysis.indexedKeys[plainFieldIndex]
	getQueryOperatorsFilters = (queryAnalysis) -> queryAnalysis.queryOperators.advanced.map( (operator) -> operator.operators.map (primitiveOperator) -> getOperatorImplementation {type: primitiveOperator, key: operator.key, value: operator.value[primitiveOperator]} ).reduce(concat)
	getPropertyUpdaters = (updateAnalysis) -> updateAnalysis.updateOperators.advanced.map (operator) -> getOperatorImplementation { type: operator.key, key: null, value: operator.value }
	createAdvancedOperatorsMatcher = (queryAnalysis) ->
		operatorsFilters = getQueryOperatorsFilters queryAnalysis
		return (item) -> operatorsFilters.every (filter) -> filter item
	createAdvancedPropertyUpdater = (updateAnalysis) ->
		updaters = getPropertyUpdaters updateAnalysis
		return (item) -> updaters.forEach (updater) -> updater item
	getPlainKeys = (queryAnalysis) -> queryAnalysis.queryOperators.plain.map (op) -> op.key
	executionPlans = {
		primaryKey: (query, queryAnalysis, table) ->
			primaryKeyName = queryAnalysis.primaryKey.key;
			primaryQueryValue = queryAnalysis.primaryKey.value;
			collection = table.where(primaryKeyName).equals primaryQueryValue
			if queryAnalysis.queryOperators.plain.length > 0
				plainPropsMatcher = createPlainPropertyMatcher query, getPlainKeys queryAnalysis
				collection.and plainPropsMatcher
			if queryAnalysis.queryOperators.advanced.length > 0
				advancedOperatorsMatcher = createAdvancedOperatorsMatcher queryAnalysis
				collection.and advancedOperatorsMatcher
			return collection
		indexedProp: (query, queryAnalysis, table) ->
			index = chooseIndex query, queryAnalysis
			if index && index.plain 
				collection = table.where(index.key).equals index.value
			else
				collection = table.toCollection.apply table, []
			
			if queryAnalysis.queryOperators.plain.length > 0
				plainPropsMatcher = createPlainPropertyMatcher query, getPlainKeys queryAnalysis
				collection.and plainPropsMatcher

			if queryAnalysis.queryOperators.advanced.length > 0
				advancedOperatorsMatcher = createAdvancedOperatorsMatcher queryAnalysis
				collection.and advancedOperatorsMatcher
			
			return collection
		fullScan: (query, queryAnalysis, table) ->
			collection = table.toCollection.apply table, []

			if queryAnalysis.queryOperators.plain.length > 0
				plainPropsMatcher = createPlainPropertyMatcher query, getPlainKeys queryAnalysis
				collection.and plainPropsMatcher

			if queryAnalysis.queryOperators.advanced.length > 0
				advancedOperatorsMatcher = createAdvancedOperatorsMatcher queryAnalysis
				collection.and advancedOperatorsMatcher
			
			return collection
	}

	createCollectionUpdater = (update, updateAnalysis) ->
		plainUpdate = updateAnalysis.updateOperators.plain.length > 0
		advancedUpdate = updateAnalysis.updateOperators.advanced.length > 0
		if plainUpdate && advancedUpdate then return
		if plainUpdate then createPlainPropertyUpdater update, updateAnalysis.keys
		if advancedUpdate then createAdvancedPropertyUpdater updateAnalysis

	createInsertResult = (insertedCount, options) -> { insertedCount: 1, insertedId: options.id, ops: [options.item], result: { ok: 1, n: 1 } }

	createUpdateResult = (updateCount, options) ->
		isUpsert = options && options.isUpsert == true
		modified = if isUpsert then 0 else updateCount
		upserted = if isUpsert then 1 else 0
		return { result: { ok: 1, nModified: modified }, modifiedCount: modified, upsertedCount: upserted, upsertedId: if isUpsert then options.id else null }

	createDeleteResult = (deletedCount) -> { result: { ok: 1, n: deletedCount }, deletedCount: deletedCount }

	createUpsertModifier = (table, query, update) -> new Dexie.Promise (resolve) ->
		return table.update(query, update).then (result) ->
			if result.modifiedCount == 0
				newItem = createObjectForUpsert query, update
				return table.insert newItem
			return Dexie.Promise.resolve result
		.then (result) ->
			finalResult = result
			if typeof result.insertedId == 'number'
				finalResult = createUpdateResult 1, { isUpsert: true, id: result.insertedId }
			return resolve finalResult

	createPlainModifier = (table, query, update) ->
		updateAnalysis = analyseUpdates update
		updater = createCollectionUpdater update, updateAnalysis
		return table.find(query).modify(updater).then (updatesCount) -> createUpdateResult updatesCount, null

	getOperatorImplementation = (operator) ->
		if operators.query.indexOf(operator.type) > -1
			operatorsImpl = comparsionQueryOperatorsImpl
		else if operators.queryLogical.indexOf(operator.type) > -1
			operatorsImpl = logicalQueryOperatorsImpl
		else if operators.update.indexOf(operator.type) > -1 
			operatorsImpl = updateOperatorsImpl
		return operatorsImpl[operator.type] operator.key, operator.value

	getOperators = (objectKind, keys, reducerMaker) -> keys.reduce( reducerMaker(objectKind, keys), {plain: [], advanced: []} )

	createQueryOperatorsReducer = (query) -> (operatorsKinds, queryKey) ->
		queryValue = query[queryKey]
		plainValue = isPlainValue queryValue
		logicalOperator = operators.queryLogical.indexOf(queryKey) > -1
		
		if plainValue
			operatorsKinds.plain.push { key: queryKey, value: queryValue, plain: plainValue }
		else if (logicalOperator)
			value = new Object
			value[queryKey] = queryValue
			operatorsKinds.advanced.push { key: queryKey, value: value, plain: plainValue, operators: [queryKey] }
		else 
			operatorsKinds.advanced.push({ key: queryKey, value: queryValue, plain: plainValue, operators: Object.keys(queryValue).filter (operatorKey) -> operators.query.indexOf(operatorKey) > -1 })
		return operatorsKinds

	createUpdateOperatorsReducer = (update) -> (updateKinds, updateKey) ->
		updateValue = update[updateKey]
		plainValue = isPlainValue updateValue
		if plainValue 
			updateKinds.plain.push { key: updateKey, value: updateValue, plain: plainValue }
		else
			updateKinds.advanced.push { key: updateKey, value: updateValue, plain: plainValue }
		return updateKinds

	getQueryOperators = (query, keys) -> getOperators query, keys, createQueryOperatorsReducer

	getUpdateOperators = (update, keys) -> getOperators update, keys, createUpdateOperatorsReducer

	getQueryPrimaryKey = (query, schema) ->
		keyName = schema.primKey.keyPath
		keyValue = query[keyName]
		keyType = typeof keyValue
		hasPrimaryKey = keyType == 'number' || keyType == 'string'
		return if hasPrimaryKey then { key: keyName, value: keyValue } else { key: false }

	getQueryIndexedKeys = (query, keys, schema) ->
		return schema.indexes.filter (indexSpec) -> keys.indexOf(indexSpec.keyPath) > -1
		.map (indexSpec) ->
			key = indexSpec.keyPath
			return { key: key, value: query[key], unique: indexSpec.unique, plain: isPlainValue query[key] }

	analyseQuery = (query, schema) ->
		keys = Object.keys query
		return { 
			keys: keys
			queryOperators: getQueryOperators(query, keys)
			primaryKey: getQueryPrimaryKey(query, schema)
			indexedKeys: getQueryIndexedKeys(query, keys, schema) 
		}

	analyseUpdates = (update) ->
		keys = Object.keys update
		return { keys: keys, updateOperators: getUpdateOperators(update, keys) }

	analyseUpdateOptions = (options) ->
		if isEmptyValue options then return new Object
		return only options, supportedUpdateOptions

	chooseExecutuionPlan = (query, schema) ->
		queryAnalysis = analyseQuery query, schema
		if queryAnalysis.primaryKey.key
			plan = 'primaryKey'
		else if queryAnalysis.indexedKeys.length > 0
			plan = 'indexedProp'
		else 
			plan = 'fullScan'
		return { queryAnalysis: queryAnalysis, execute: executionPlans[plan] }

	performCollectionUpdate = (table, query, update, options) ->
		updateModifier = if options.upsert == true then createUpsertModifier else createPlainModifier
		return updateModifier table, query, update

	performFind = (table, query) ->
		if isEmptyValue(query) then return table.toCollection.apply table, []
		executionPlan = chooseExecutuionPlan query, table.schema
		return executionPlan.execute query, executionPlan.queryAnalysis, table

	performInsert = (table, item) ->
		idKey = table.schema.primKey.keyPath
		return table.add(item).then (id) ->
			newObj = only item, Object.keys(item)
			newObj[idKey] = id
			return createInsertResult 1, { item: item, id: id }

	performRemove = (table, query) -> performFind(table, query).delete().then createDeleteResult

	performDrop = (table) -> table.toCollection().delete().then createDeleteResult

	# Mongo Class Definition
	class Mongo extends Dexie
		constructor: (name) ->
			super name
			@WriteableTable = if @WriteableTable then @WriteableTable else @Table
			@collection = (collectionName) -> @table collectionName
			@Table.prototype.count = (query) ->
				emptyQuery = isEmptyValue query
				collection = if emptyQuery then @toCollection else performFind @, query
				return collection.count
			@Table.prototype.find = (query) -> return performFind @, query
			@Table.prototype.findOne = (query) -> performFind(@, query).first
			@Table.prototype.insert = (item) -> performInsert @, item
			@Table.prototype.remove = (query) -> performRemove @, query
			@Table.prototype.drop = () -> performDrop @
			@WriteableTable.prototype.update = (query, update, options) ->
				processedOptions = analyseUpdateOptions options
				return performCollectionUpdate @, query, update, processedOptions
