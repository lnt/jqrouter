registerModule(this,'jqrouter', function(jqrouter, _jqrouter_){
	
	var pathname, hash, contextPath = "/";
	jqrouter.hashchange = function(){
		var _path = document.location.pathname
		var _hash = document.location.hash;
		if (hash != document.location.hash) {
			hash = document.location.hash;
			this.invoke(hash);
		}
		if (pathname != document.location.pathname) {
			pathname = document.location.pathname;
			this.invoke(pathname.replace(contextPath,"/"));
		}
	};
	
	jqrouter.cache = {};
	jqrouter.onchange_map = {};
	jqrouter.refineKey = function(_key){
		//(contextPath + _key).replace(/[\/]+/g,'/')
		return (_key).replace(/\{(.*?)\}/gi,'*')
		return _key;// .replace(/\[/gi, '#').replace(/\]/gi, '');
	};
	jqrouter.split = function(key){
		return key.split(/[\/]+/gi);
	};
	jqrouter.invoke = function(_key){
		console.warn("invokd..",_key)
		var key = this.refineKey(_key);
		return this.callFun(key);
	};
	jqrouter.on = function(_key, fun, isHTTP){
		var key = this.refineKey(_key);
		console.error("key",key);
		var keys = jqrouter.split(key);
		var ref = this.onchange_fun;
		var _nextKey = keys[0];
		var _key = keys[0];
		for ( var i = 0; i < keys.length - 1; i++) {
			_key = keys[i];
			_nextKey = keys[i + 1];
			_atKey = '@' + _key;
			if (!ref[_atKey])
				ref[_atKey] = {
					key : _key, next : this.next, nextKey : _nextKey
				};
			ref = ref[_atKey];
		}
		ref['@' + _nextKey] = {
			fun : fun,
			key : _nextKey, next : function(o){
				console.warn("oo",o)
				this.fun.apply(jqrouter,o.arg)
			}, isHTTP : isHTTP, nextKey : null
		};
	};

	// execute event handler
	jqrouter._callFun = function(key){
		var keys = jqrouter.split(key);
		if (this.onchange_fun.next) {
			return this.onchange_fun.next({
				url : key, arg : [], index : 0, keys : keys
			});
		}
	};

	jqrouter.next = function(o){
		if (this['@' + o.keys[o.index]]) {
			return this['@' + o.keys[o.index++]].next(o);
		} else if (this['@*']) {
			o.arg.push(o.keys[o.index++]);
			return this['@*'].next(o);
		}
		return true;
	};
	jqrouter.onchange_fun = {
		next : jqrouter.next,
	};
	
	jqrouter.TRIGGER = debounce(function(){
		jqrouter.trigger();
	});
	
	// Registers an event to be triggered
	jqrouter.callFun = function(key){
		this.onchange_map[key] = true;
		// return this._callFun(key);
		jqrouter.TRIGGER();
	};
	// process event queue
	jqrouter.trigger = function(){
		for ( var key in this.onchange_map) {
			var propagation = this._callFun(key);
			delete this.onchange_map[key]
		}
	};
	jqrouter.go = function(url){
		return window.history.pushState(null,null,url);
	};
	jqrouter._ready_ = function(){
	    var pushState = history.pushState;
	    
	    history.pushState = function(state) {
	    	console.warn("url pusing",state);
	        if (typeof history.onpushstate == "function") {
	           // history.onpushstate({state: state});
	        }
	        var ret = pushState.apply(history, arguments);
	        jqrouter.hashchange();
	        return ret;
	    }
		window.onpopstate = history.onpushstate = function(e) {
			console.warn("url changed",e);
			jqrouter.hashchange();
		}
		return jqrouter.hashchange();
	}
	jqrouter._config_ = function(moduleConfig,appConfig){
		contextPath = appConfig.contextPath;
	};
});