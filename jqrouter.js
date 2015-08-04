_define_('jqrouter', function(jqrouter){
	
	var JQROUTER = {},jqr;
	
	var otherWise = true, $matched = false;
	var pathname, hash, queryString,hashData = {},counter=0, intialized = false,otherwiseURL;
	var HASH_PARAM_PREFIX = "#&";
	JQROUTER.dead = {};
	var hashchange = function(){
		var _hashChange = (hash != document.location.hash);
		var _pathChange = (pathname != document.location.pathname &&
				(true || (document.location.pathname.length>0 && document.location.pathname.indexOf(pathname)!=0))
		);
		var _queryChange = (queryString!=document.location.search);
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
		if (_queryChange) {
			queryString = document.location.search;
		}
		
		if(_hashChange){
			JQROUTER.invoke(hash);
		}
		if(_pathChange){
			JQROUTER.invoke(pathname.replace(jqr.appContext,"/"));
		}
		if(_queryChange){
			JQROUTER.SET_PARAMS(URI.decode(queryString.slice(1)));
		}
	};
	
	var refineKey = function(_key){
		//(jqr.appContext + _key).replace(/[\/]+/g,'/')
		return (URI.clean(_key+"/")).replace(/\{(.*?)\}/gi,'$').replace("*","$");
		return _key;// .replace(/\[/gi, '#').replace(/\]/gi, '');
	};
	
	var splitURL = function(key){
		return key.split(/[\/]+/gi);
	};
	
	JQROUTER.onchange_map = {};

	// execute event handler
	JQROUTER._callFun = function(key,id,args){
		var keys = splitURL(key);
		$matched = false;
		if (this.onchange_fun.next) {
			return this.onchange_fun.next(0,{
				url : key, arg : [], extraArg : args, 
				index : 0, keys : keys, id : id
			});
		}
	};

	JQROUTER.next = function(index,o){
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
					if(JQROUTER.dead[this.fun[j].id]){
						delete JQROUTER.dead[this.fun[j].id];
						delete this.fun[j];
					} else if(typeof this.fun[j].cb === 'function'){
						otherWise = false;
						$matched = true;
						//this.fun[j].cb.apply(JQROUTER,o.arg.concat([o.extraArg]));
						o.arg.concat([o.extraArg]);
						this.fun[j].cb.call(JQROUTER,new RouterEvent(o,this.fun[j]),this.fun[j].target||o.url,hashData);
					}
				}
			}
		}
		return true;
	};
	
	function RouterEvent(o,funJ){
		this.params = {};
		for(var i in funJ.paramKeys){
			this.params[funJ.paramKeys[i]] = o.arg[i];
		}
		this.args = o.arg;
		this.url = o.url;
		this.urlEvent = funJ.url.replace(/\{\_\}/g,"*");
	}
	
	JQROUTER.onchange_fun = {
		next : JQROUTER.next,
	};
	
	JQROUTER.TRIGGER = debounce(function(arg){
		intialized = true;
		JQROUTER.trigger(arg);
		if(!$matched && otherwiseURL){
			var _otherwiseURL = otherwiseURL; otherwiseURL = null;
			JQROUTER.GO(_otherwiseURL);
		}
	});
	
	// Registers an event to be triggered
	JQROUTER.callFun = function(key,arg){
		this.onchange_map[key] = true;
		// return this._callFun(key);
		JQROUTER.TRIGGER(arg);
	};
	
	// process event queue
	JQROUTER.trigger = function(arg){
		for ( var key in this.onchange_map) {
			var propagation = this._callFun(key,undefined,arg);
			delete this.onchange_map[key];
		}
	};
	
	var isChanged = function(key,value){
		return (JSON.stringify(hashData[key]) !== JSON.stringify(value));
	};
	
	JQROUTER.invoke = function(_key,args){
		if(_key.indexOf("?") === 0){
			JQROUTER.SET_PARAMS(URI.decode(_key.slice(1)));
		} else {
			var key = refineKey(_key);
			return this.callFun(key,args);
		}
	};
	
	var paramEvents = {};
	JQROUTER.CALL_PARAM_CHANGE = debounce(function(keyname){
		for(var i in paramEvents){
			if(paramEvents[i] && paramEvents[i].name == keyname && is.Function(paramEvents[i].fun)){
				paramEvents[i].fun(keyname,hashData[keyname]);
			}
		}
	});
	
	//Globals Functions
	JQROUTER.GO = debounce(function(url){
		var _url = url+"";
		var goURL = (_url.indexOf("#") === 0) ? url : ((_url.indexOf("?") === 0) ? (pathname+_url) : URI.clean(jqr.appContext + url));
		return window.history.pushState(null,null,goURL);
	});
	
	JQROUTER.REOLOAD = function(url){
		window.location.href = (url!==undefined)?  URI.clean(jqr.appContext + url) : window.location.href;
	};
	JQROUTER.SET_PARAM = function(key,value){
		if(isChanged(key,value)){
			hashData[key] = JSON.parse(JSON.stringify(value));
			JQROUTER.CALL_PARAM_CHANGE(key);
			JQROUTER.GO("?"+URI.encode(hashData));
			return true;
		} return false;
	};
	JQROUTER.GET_PARAM = function(key,defValue){
		return hashData[key] ===undefined ? defValue : JSON.parse(JSON.stringify(hashData[key]));
	};
	JQROUTER.GET_PARAMS = function(keyMap){
		if(keyMap!==undefined){
			var retMap = {};
			for(var key in keyMap){
				retMap[key] = JQROUTER.GET_PARAM(key,keyMap[key]);
			}
			return retMap;
		} else {
			return hashData;
		}
	};
	JQROUTER.SET_PARAMS = function(newHashData){
		hashData = {};
		for(var key in newHashData){
			if(isChanged(key,newHashData[key])){
				hashData[key] = JSON.parse(JSON.stringify(newHashData[key]));
				JQROUTER.CALL_PARAM_CHANGE(key);
			}
		}
		JQROUTER.GO("?"+URI.encode(hashData));
	};
	
	JQROUTER.intialize = function(event) {
		if(intialized) return;
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
	        hashchange();
	        return ret;
	    };
		window.onpopstate = history.onpushstate = function(e) {
			hashchange();
		};
		hashchange();
	};
	
	//when.ready(JQROUTER.intialize);
	
	JQROUTER._config_ = function(moduleConfig,appConfig){
		jqr.start(appConfig.appContext);
	};
	
	//APIS Starts from Here
	jqr =  {
		ids : [],
		paramEventIds : [],
		$matched : false,
		appContext : "/",
		routerBase : "",
		__bindStack__ : 0,
		start : function(appContext){
			jqr.appContext = appContext || jqr.appContext;
			this.appContext = jqr.appContext; // jqr here and actual prototype are different so need to fix it
			JQROUTER.intialize();
		},
		_instance_ : function(self,routerEvents){
			this.ids = [];
			this.$matched = false;
			if(self){
				this.routerBase = self.routerBase || this.routerBase;
			}
			if(is.Object(self) && (routerEvents = routerEvents || self.routerEvents)){
				this.bind(self,routerEvents);
			}
		},
		instance : function(){
			var ins = Object.create(this);
			ins._instance_.apply(ins,arguments);
			return ins;
		},
		bind : function(self,routerEvents){
			var rtr = this;
			for(var i in routerEvents){
				rtr.__bindStack__++;
				debounce(function(url,fName){
					rtr.on(url,function(){
						if(is.Function(self[fName])){
							self[fName].apply(self,arguments);
						} else if(is.Function(self["_routerEvents_"])){
							self["_routerEvents_"].apply(self,arguments);
						}
					},fName);	
					rtr.__bindStack__--;
					rtr.onbind();
				})(i,routerEvents[i]);
			}
		},
		onbind : function(cb){
			if(is.Function(cb)){
				this.__bindStackFunction__ = cb;
			}
			if(is.Function(this.__bindStackFunction__) && this.__bindStack__ == 0){
				this.__bindStackFunction__(this)
			}
		},
		on : function(__key, fun, target){
			var __keys = (__key.indexOf("*")>-1) ? [__key.replace("*","{_}"),__key.replace("*","")] : [__key];
			var isHASH = __key.indexOf("#")>-1;
			var isQUERY = __key.indexOf("?")==0;
			if(isQUERY){
				var query = URI.decode(__key.slice(1));
				for(var key in query){
					var id = counter++;
					this.paramEventIds.push(id);
					paramEvents[id] = {
						name : key, fun : fun
					};
				}
			} else {
				for(var _i in __keys){
					var _key = URI.clean(this.routerBase + __keys[_i]);
					var paramKeys = (_key.match(/(\{([^}]+)\}|\*)/g)||[]).map(function(str){
						return str.substring(1, str.length - 1);
					});
					var key = refineKey(_key);
					var keys = splitURL(key);
					var ref = JQROUTER.onchange_fun;
					var _nextKey = keys[0];
					var _key = keys[0];
					for ( var i = 0; i < keys.length ; i++) {
						_key = keys[i];
						_nextKey = keys[i + 1];
						_atKey = '@' + _key;
						ref[_atKey] = ref[_atKey] || {
								fun : [], ids : [],
								key : _key, nextKey : _nextKey, next : JQROUTER.next
							};
						ref = ref[_atKey];
					}
					var id = counter++;
					ref.fun.push({ cb : fun, id : id, url : __keys[_i], paramKeys : paramKeys,target : target });
					if(intialized){
						JQROUTER._callFun(
								isHASH ? refineKey(document.location.hash) :
								refineKey(document.location.pathname).replace(this.appContext,"/"),id);
						this.$matched = this.$matched || $matched;
					}
					this.ids.push(id);			
				}
	
			}
			return this;
		},
		off : function(){
			for(var i in this.ids){
				JQROUTER.dead[this.ids[i]] = true;
			}
			for(var i in this.paramEventIds){
				delete paramEvents[this.paramEventIds[i]];
			}
		},
		otherwise : function(goToURL){
			var self = this;
			this.onbind(function(){
				if(intialized && (otherWise || !self.$matched)){
					JQROUTER.GO(goToURL);
				} else if(!intialized){
					otherwiseURL = goToURL;
				}
			});
			return self;
		},
		go : JQROUTER.GO,
		reload : JQROUTER.REOLOAD,
		getQueryParam : JQROUTER.GET_PARAM,
		setQueryParam : JQROUTER.SET_PARAM,
		getQueryParams : JQROUTER.GET_PARAMS,
		setQueryParams : JQROUTER.SET_PARAMS
	};
	
	RouterEvent.prototype = jqr;
	return jqr;
});