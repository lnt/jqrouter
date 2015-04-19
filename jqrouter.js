registerModule(this,'jqrouter', function(jqrouter, _jqrouter_){
	
	jqrouter._instance_ = function(){
		this.ids = [];
	};
	var _jqrouter_ = _jqrouter_ || jqrouter._instance_.prototype;
	
	var otherWise = true;
	var pathname, hash, contextPath = "/",hashData = {},counter=0, intialized = false;;
	var HASH_PARAM_PREFIX = "#&";
	jqrouter.dead = {};
	jqrouter.hashchange = function(){
		var _hashChange = (hash != document.location.hash);
		var _pathChange = (pathname != document.location.pathname);
		otherWise = true;
		/*
		 * Need to change URL first as it may trigger twice in between
		 */
		if (_hashChange) {
			hash = document.location.hash;
		}
		if (_pathChange) {
			pathname = document.location.pathname;
		}
		if(_hashChange){
			this.invoke(hash);
		}
		if(_pathChange){
			this.invoke(pathname.replace(contextPath,"/"));
		}
	};
	
	jqrouter.cache = {};
	jqrouter.onchange_map = {};
	jqrouter.refineKey = function(_key){
		//(contextPath + _key).replace(/[\/]+/g,'/')
		return (jqrouter.cleanUrl(_key+"/")).replace(/\{(.*?)\}/gi,'$')
		return _key;// .replace(/\[/gi, '#').replace(/\]/gi, '');
	};
	jqrouter.split = function(key){
		return key.split(/[\/]+/gi);
	};
	jqrouter.invoke = function(_key,args){
		if(_key.indexOf("#?") === 0){
			jqrouter.setKeys(jqrouter.decode(_key.replace("#?","")));
		} else {
			var key = this.refineKey(_key);
			return this.callFun(key,args);
		}
	};
	
	_jqrouter_.on = function(_key, fun, isHTTP){
		var key = jqrouter.refineKey(_key);
		var keys = jqrouter.split(key);
		var ref = jqrouter.onchange_fun;
		var _nextKey = keys[0];
		var _key = keys[0];
		for ( var i = 0; i < keys.length ; i++) {
			_key = keys[i];
			_nextKey = keys[i + 1];
			_atKey = '@' + _key;
			ref[_atKey] = ref[_atKey] || {
					fun : [],
					key : _key, nextKey : _nextKey, next : jqrouter.next
				};
			ref = ref[_atKey];
		}
		fun.id = counter++;
		ref.fun.push(fun);
		if(intialized){
			jqrouter._callFun(jqrouter.refineKey(document.location.pathname).replace(contextPath,"/"),fun.id);
		}
		this.ids.push(fun.id);
		return this;
	};
	jqrouter.on = function(_key, fun, isHTTP){
		var self = jqrouter.instance ? jqrouter.instance() : new jqrouter._instance_();
		return self.on(_key, fun, isHTTP);
	};

	_jqrouter_.off = function(){
		for(var i in this.ids){
			jqrouter.dead[this.ids[i]] = true;
		}
	};
	
	jqrouter.otherwise = function(goToURL){
		if(otherWise){
			jqrouter.go(goToURL)
		}
		return this;
	};
	
	_jqrouter_.otherwise = function(goToURL){
		return jqrouter.otherwise(goToURL);
	};
	
	// execute event handler
	jqrouter._callFun = function(key,id,args){
		var keys = jqrouter.split(key);
		if (this.onchange_fun.next) {
			return this.onchange_fun.next(0,{
				url : key, arg : [], extraArg : args, 
				index : 0, keys : keys, id : id
			});
		}
	};

	jqrouter.next = function(index,o){
		var curIndex = o.index++;
		if (this['@' + o.keys[index]]) {
			this['@' + o.keys[index]].next(index+1,o);
		}
		if (this['@$']) {
			o.arg.push(o.keys[index]);
			this['@$'].next(index+1,o);
		}
		if(index==o.keys.length){
			for(var j in this.fun){
				if(this.fun[j] && (o.id===undefined || o.id === this.fun[j].id)){
					if(jqrouter.dead[this.fun[j].id]){
						delete jqrouter.dead[this.fun[j].id];
						delete this.fun[j];
					} else if(typeof this.fun[j] === 'function'){
						otherWise = false;
						this.fun[j].apply(jqrouter,o.arg.concat([o.extraArg]));
					}
				}
			}
		}
		return true;
	};
	jqrouter.onchange_fun = {
		next : jqrouter.next,
	};
	
	jqrouter.TRIGGER = debounce(function(arg){
		intialized = true;
		jqrouter.trigger(arg);
	});
	
	// Registers an event to be triggered
	jqrouter.callFun = function(key,arg){
		this.onchange_map[key] = true;
		// return this._callFun(key);
		jqrouter.TRIGGER(arg);
	};
	// process event queue
	jqrouter.trigger = function(arg){
		for ( var key in this.onchange_map) {
			var propagation = this._callFun(key,undefined,arg);
			delete this.onchange_map[key]
		}
	};
	jqrouter.cleanUrl = function(url){
		return url.replace(/[\/]+/g,'/');
	};
	jqrouter.go = function(url){
		var goURL = ((url+"").indexOf("#") === 0) ? url : jqrouter.cleanUrl(contextPath + url);
		return window.history.pushState(null,null,goURL);
	};
	jqrouter.reload = function(url){
		window.location.href = (url!==undefined)?  jqrouter.cleanUrl(contextPath + url) : window.location.href;
	};
	jqrouter._ready_ = function(){
	    var pushState = history.pushState;
	    
	    history.pushState = function(state) {
	        if (typeof history.onpushstate == "function") {
	           // history.onpushstate({state: state});
	        }
	        var ret;
	        if((arguments[2]+"").indexOf("#") === 0){
	        	window.location.hash = arguments[2];
	        } else {
	        	ret = pushState.apply(history, arguments);
	        }
	        jqrouter.hashchange();
	        return ret;
	    }
		window.onpopstate = history.onpushstate = function(e) {
			jqrouter.hashchange();
		}
		$('body').on('click','a.jqrouter,a[jqrouter]', function(e){
			var href = this.getAttribute('jqrouter') || this.getAttribute('href');
			if(!jqrouter.isRemote(href) && !e.ctrlKey){
				if(href.indexOf(HASH_PARAM_PREFIX) === 0){
					var params = href.replace(HASH_PARAM_PREFIX,"").split("=");
					if(jqrouter.setKey.apply(jqrouter,params)){
						$(this).trigger("jqrouter#&"+params[0],{key : params[0], value : params[1]});
						//jqrouter.invoke("#&"+params[0]+"=",params[1]);
					}
					//jqrouter.go("#?"+jqrouter.encode(hashData));
					return preventPropagation(e)
				} else if(href.indexOf("#") === 0){
					//jqrouter.go(href.replace(contextPath,"/"));
				} else {
					jqrouter.go(href.replace(contextPath,"/"));
					return preventPropagation(e)
				}
			}
		});
		jqrouter.hashchange();
	};
	
	var isChanged = function(key,value){
		return (JSON.stringify(hashData[key]) !== JSON.stringify(value));
	};
	
	jqrouter.setKey = function(key,value){
		if(isChanged(key,value)){
			hashData[key] = JSON.parse(JSON.stringify(value));
			jqrouter.go("#?"+jqrouter.encode(hashData));
			jqrouter.invoke("#&"+key+"=",value);
			return true
		} return false;
	};
	
	jqrouter.getKey = function(key,defValue){
		return hashData[key] ===undefined ? defValue : JSON.parse(JSON.stringify(hashData[key]));
	};
	
	jqrouter.getKeys = function(keyMap){
		var retMap = {};
		for(var key in keyMap){
			retMap[key] = jqrouter.getKey(key,keyMap[key])
		}
		return retMap;
	};
	jqrouter.setKeys = function(newHashData){
		for(var key in newHashData){
			if(isChanged(key,newHashData[key])){
				hashData[key] = JSON.parse(JSON.stringify(newHashData[key]));
				jqrouter.invoke("#&"+key+"=",newHashData[key])
			}
		}
		jqrouter.go("#?"+jqrouter.encode(hashData));
	};
	jqrouter.encode = function(param){
		return $.param(param);
		return encode64(JSON.stringify(hashData))
	};
	
	jqrouter.decode = function (p) {
	    var params = {};
	    var pairs = p.split('&');
	    for (var i=0; i<pairs.length; i++) {
	    	if(pairs[i]){
	    		var pair = pairs[i].split('=');
		        var accessors = [];
		        var name = decodeURIComponent(pair[0]), value = decodeURIComponent(pair[1]);

		        var name = name.replace(/\[([^\]]*)\]/g, function(k, acc) { accessors.push(acc); return ""; });
		        accessors.unshift(name);
		        var o = params;

		        for (var j=0; j<accessors.length-1; j++) {
		            var acc = accessors[j];
		            var nextAcc = accessors[j+1];
		            if (!o[acc]) {
		                if ((nextAcc == "") || (/^[0-9]+$/.test(nextAcc)))
		                    o[acc] = [];
		                else
		                    o[acc] = {};
		            }
		            o = o[acc];
		        }
		        acc = accessors[accessors.length-1];
		        if (acc == "")
		            o.push(value);
		        else
		            o[acc] = value;
	    	}
	    }
	    return params;
	    return JSON.parse(decode64(value));
	};
	jqrouter.isRemote = function(path){
		return  (path.indexOf('http://')==0 || path.indexOf('https://')==0)
	};
	jqrouter._config_ = function(moduleConfig,appConfig){
		contextPath = appConfig.contextPath;
	};
});