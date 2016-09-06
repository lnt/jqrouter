_define_('jqrouter', function(jqrouter) {

    var LOG = function() {
        //return console.error("hashchange",arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);
    };

    var JQROUTER = {}, jqr;
    var otherWise = true, $matched = false, $matched_any = false;
    var pathname, hash, queryString, hashData = {}, counter = 0, intialized = false, otherwiseURL, postState, hashState, hashStateData = {};
    var HASH_PARAM_PREFIX = "?!";
    JQROUTER.dead = {};
    var getHash = function() {
        return document.location.hash.split(HASH_PARAM_PREFIX)[0];
    };
    var getState = function() {
        return document.location.hash.split(HASH_PARAM_PREFIX)[1] || "";
    };
    var setState = function(value) {
        if (jqr.STATE_ENABLED) {
            var newHash = getHash() + HASH_PARAM_PREFIX + value;
            return document.location.hash = newHash;
        }
    };
    var setHash = function(value) {
        var newHash = value + appendState();
        return document.location.hash = newHash;
    };

    var appendState = function() {
        return (jqr.STATE_ENABLED ? (HASH_PARAM_PREFIX + hashState) : "");
    };

    window.onhashchange = function() {
        hashState = window.btoa(JSON.stringify(hashStateData));
        setState(hashState);
    };

    var hashchange = function() {
        var _hashChange = (hash != getHash());
        var _pathChange = (pathname != document.location.pathname &&
            (true || (document.location.pathname.length > 0 && document.location.pathname.indexOf(pathname) != 0))
            );
        var _queryChange = (queryString != document.location.search);
        var _hashStateChange = (hashState != getState());
        otherWise = true;
        /*
         * Need to change URL first as it may trigger twice in between
         */
        if (_hashChange) {
            hash = getHash();
        }
        if (_hashStateChange) {
            hashState = getState();
        }
        if (_pathChange) {
            pathname = document.location.pathname;
        }
        if (_queryChange) {
            queryString = document.location.search;
        }

        if (_hashChange) {
            JQROUTER.invoke(hash);
        }
        LOG("_pathChange", _pathChange)
        if (_pathChange) {
            JQROUTER.invoke(pathname.replace(jqr.appContext, "/"));
        }
        if (_queryChange) {
            JQROUTER.SET_PARAMS(URI.decode(queryString.slice(1)), _pathChange ? pathname.replace(jqr.appContext, "/") : undefined);
        }
        setState(hashState);
    };

    var refineKey = function(_key) {
        //(jqr.appContext + _key).replace(/[\/]+/g,'/')
        return (URI.clean(_key + "/")).replace(/\{(.*?)\}/gi, '$').replace("*", "$");
        return _key;// .replace(/\[/gi, '#').replace(/\]/gi, '');
    };

    var splitURL = function(key) {
        return key.split(/[\/]+/gi);
    };

    JQROUTER.onchange_map = {};

    // execute event handler
    JQROUTER.next = function(index, o) {
        var curIndex = o.index++;
        if (this['@' + o.keys[index]]) {
            this['@' + o.keys[index]].next(index + 1, o);
        }
        if (this['@$']) {
            o.arg.push(o.keys[index]);
            this['@$'].next(index + 1, o);
        }
        if (index == o.keys.length) {
            for (var j in this.fun) {
                if (this.fun[j] && (o.id === undefined || o.id === this.fun[j].id)) {
                    if (JQROUTER.dead[this.fun[j].id]) {
                        delete JQROUTER.dead[this.fun[j].id];
                        delete this.fun[j];
                    } else if (typeof this.fun[j].cb === 'function') {
                        otherWise = false;
                        $matched = true;
                        //this.fun[j].cb.apply(JQROUTER,o.arg.concat([o.extraArg]));
                        o.arg.concat([o.extraArg]);
                        this.fun[j].cb.call(JQROUTER, new RouterEvent(o, this.fun[j]), this.fun[j].target || o.url, hashData, postState);
                    }
                }
            }
        }
        return true;
    };

    JQROUTER._callFun = function(key, id, args) {
        var keys = splitURL(key);
        $matched = false;
        if (this.onchange_fun.next) {
            return this.onchange_fun.next(0, {
                url: key, arg: [], extraArg: args,
                index: 0, keys: keys, id: id
            });
        }
    };

    function RouterEvent(o, funJ) {
        this.params = {};
        for (var i in funJ.paramKeys) {
            this.params[funJ.paramKeys[i]] = o.arg[i];
        }
        this.args = o.arg;
        this.url = o.url;
        this.urlEvent = funJ.url.replace(/\{\_\}/g, "*");
    }

    JQROUTER.onchange_fun = {
        next: JQROUTER.next
    };

    JQROUTER.TRIGGER = debounce(function(arg) {
        intialized = true;
        JQROUTER.trigger(arg);
        if (!$matched && otherwiseURL) {
            var _otherwiseURL = otherwiseURL;
            otherwiseURL = null;
            JQROUTER.GO(_otherwiseURL);
        }
    });

    // Registers an event to be triggered
    JQROUTER.callFun = function(key, arg) {
        this.onchange_map[key] = true;
        // return this._callFun(key);
        JQROUTER.TRIGGER(arg);
    };

    // process event queue
    JQROUTER.trigger = function(args) {
        for (var key in this.onchange_map) {
            var propagation = this._callFun(key, undefined, args);
            delete this.onchange_map[key];
        }
        jqr._router_(new RouterEvent({
            url: null, arg: [], extraArg: args,
            index: null, keys: [], id: null
        }, {url : ""}), key, hashData, postState);
    };

    var isChanged = function(key, value) {
        return (JSON.stringify(hashData[key]) !== JSON.stringify(value));
    };

    JQROUTER.invoke = function(_key, args) {
        if (_key.indexOf("?") === 0) {
            JQROUTER.SET_PARAMS(URI.decode(_key.slice(1)));
        } else {
            var key = refineKey(_key);
            return this.callFun(key, args);
        }
    };

    var paramEvents = {};
    var KEYNAME_LIST = {};
    JQROUTER.CALL_PARAM_CHANGE = function(keyname, xtr) {
        KEYNAME_LIST[keyname] = keyname;
        JQROUTER.CALL_PARAM_CHANGE_DO();
    };

    JQROUTER.CALL_PARAM_CHANGE_DO = debounce(function() {
        for (var i in paramEvents) {
            var keyname = paramEvents[i] && paramEvents[i].name;
            if (KEYNAME_LIST[keyname] && is.Function(paramEvents[i].fun)) {
                paramEvents[i].fun(keyname, hashData[keyname]);
            }
        }
        return KEYNAME_LIST = {};
    });


    //Globals Functions
    JQROUTER.GO = debounce(function(url, params, postData, silent) {
        var _url = url + "";
        var goURL = (_url.indexOf("#") === 0) ? url : ((_url.indexOf("?") === 0) ? (pathname + _url + hash) : URI.clean(jqr.appContext + url));
        if (!is.Empty(params)) {
            JQROUTER.SET_PARAMS(params, goURL, postData);
        } else {
            return window.history.pushState(postData || {}, null, goURL, undefined, silent);
        }
    });

    JQROUTER.REOLOAD = function(url) {
        if (url === undefined) {
            return  window.location.reload();
        }
        window.location.href = (url !== undefined) ? URI.clean(jqr.appContext + url) : window.location.href;
    };
    JQROUTER.SET_PARAM = function(key, value) {
        if (isChanged(key, value)) {
            hashData[key] = JSON.parse(JSON.stringify(value));
            JQROUTER.CALL_PARAM_CHANGE(key);
            JQROUTER.GO("?" + URI.encode(hashData), undefined, undefined, true);
            return true;
        }
        return false;
    };
    JQROUTER.GET_PARAM = function(key, defValue) {
        return hashData[key] === undefined ? defValue : JSON.parse(JSON.stringify(hashData[key]));
    };
    JQROUTER.GET_PARAMS = function(keyMap) {
        if (keyMap !== undefined) {
            var retMap = {};
            for (var key in keyMap) {
                retMap[key] = JQROUTER.GET_PARAM(key, keyMap[key]);
            }
            return JSON.parse(JSON.stringify(retMap));
        } else {
            return JSON.parse(JSON.stringify(hashData));
        }
    };
    JQROUTER.SET_PARAMS = function(newHashData, goUrl, postData) {
        if (goUrl !== undefined || true) { //Mandatory as Back-url will not work otherwise
            hashData = {};
        }
        for (var key in newHashData) {
            if (isChanged(key, newHashData[key])) {
                hashData[key] = JSON.parse(JSON.stringify(newHashData[key]));
                JQROUTER.CALL_PARAM_CHANGE(key);
            }
        }
        if (goUrl == undefined) {
            JQROUTER.GO("?" + URI.encode(hashData), undefined, postData);
        } else {
            var info = URI.info(goUrl);
            //if(goUrl.indexOf("?"==0)){
            JQROUTER.GO(pathname + "?" + URI.encode(hashData) + info.hash, undefined, postData);
            //}
        }
    };
    var LAST_URL;
    JQROUTER.intialize = function(event) {
        if (intialized) return;
        var pushState = history.pushState;
        history.pushState = function(state, a, b, c, silent) {

            var newURL = new URL("http://localhost:8080" + b)
            if (newURL.pathname === window.location.pathname
                && newURL.search === window.location.search
                && newURL.hash === getHash()) {
                return false;
            }

            if (typeof history.onpushstate == "function") {
                // history.onpushstate({state: state});
            }
            var ret;
            if (newURL.pathname !== window.location.pathname) {
                postState = state;
            }
            try {
                if ((arguments[2] + "").indexOf("#") === 0) {
                    setHash(arguments[2]);
                } else {
                    if (!newURL.hash && newURL.pathname === window.location.pathname) {
                        b = b + getHash() + appendState();
                    }
                    b = (b || "").trim();
                    LOG(LAST_URL, "==", b, "===", LAST_URL != b);
                    if (LAST_URL != b) {
                        LAST_URL = b;
                        LOG("PUSHING", postState, a, b, c, silent)
                        ret = pushState.apply(history, [postState, a, b, c, silent]);
                    }
                }
            } catch (e) {
                LOG("JQROUTER::", e);
            }
            if (!silent) {
                hashchange();
            }
            return ret;
        };
        window.onpopstate = history.onpushstate = function(e, a, b, c) {
            postState = e.state || {};
            LAST_URL = e, window.location.href;
            hashchange();
        };
        hashchange();
        hashStateData = hashState ? JSON.parse(window.atob(hashState)) : {};
    };

    //when.ready(JQROUTER.intialize);

    JQROUTER._config_ = function(moduleConfig, appConfig) {
        jqr.start(appConfig.appContext);
    };

    var whichDefined = function() {
        var vars = arguments;
        for (var i = 0; i < vars.length; i++) {
            if (is.Value(vars[i])) return vars[i];
        }
        return undefined;
    };
    var RouterLock = function(prop) {
        mixin(this, prop);
    };
    RouterLock.prototype.unlock = function() {
        var self = this;
        jqr._lock = jqr._lock.filter(function(obj) {
            return obj != self;
        });
    };

    //APIS Starts from Here
    jqr = {
        STATE_ENABLED: false,
        ids: [],
        paramEventIds: [],
        $matched: false,
        appContext: "/",
        routerBase: "",
        __bindStack__: 0,
        start: function(appContext) {
            jqr.appContext = appContext || jqr.appContext;
            this.appContext = jqr.appContext; // jqr here and actual prototype are different so need to fix it
            JQROUTER.intialize();
        },
        _instance_: function(self, routerEvents) {
            this.ids = [];
            this.__id__ = getUUID();
            this.$matched = false;
            this._state_ = {
                _: {},
                name: undefined,
                set: function(key, value) {
                    if (value !== undefined) {
                        this._[key] = value;
                        hashStateData[this.name] = this._;
                        setState(btoa(JSON.stringify(hashStateData)));
                    }
                    return  this._[key];
                }, get: function(key, defValue) {
                    if (this._[key] == undefined && defValue !== undefined) {
                        this.set(key, defValue);
                    }
                    return  this._[key];
                }
            };
            if (self) {
                this.routerBase = self.routerBase || this.routerBase;
            }
            if (is.Object(self)) {
                this.bind(self, routerEvents);
            }
        },
        instance: function() {
            var ins = Object.create(this);
            ins._instance_.apply(ins, arguments);
            return ins;
        },
        map: function(routerEvents) {
            var self = this, id = "___jq__bind__" + getUUID();
            return function() {
                if (!this.hasOwnProperty(id)) {
                    this[id] = self.instance().bind(this, routerEvents);
                }
                return this[id];
            }
        },
        bind: function(self, routerEvents) {
            var rtr = this;
            var _routerEvents = routerEvents || self.routerEvents;
            for (var i in _routerEvents) {
                rtr.__bindStack__++;
                debounce(function(url, fName) {
                    rtr.on(url, function() {
                        if (is.Function(self[fName])) {
                            self[fName].apply(self, arguments);
                        } else if (is.Function(self["_routerEvents_"])) {
                            self["_routerEvents_"].apply(self, arguments);
                        } else if (is.Function(self["_router404_"])) {
                            self["_router404_"].apply(self, arguments);
                        }
                        if (is.Function(self["_router_"])) {
                            self["_router_"].apply(self, arguments);
                        }
                    }, fName);
                    rtr.__bindStack__--;
                    rtr.onbind();
                })(i, _routerEvents[i]);
            }
            return this;
        },
        onbind: function(cb) {
            if (is.Function(cb)) {
                this.__bindStackFunction__ = debounce(cb);
            }
            if (is.Function(this.__bindStackFunction__) && this.__bindStack__ == 0) {
                this.__bindStackFunction__(this);
                this.__bindStackFunction__ = undefined;
            }
        },
        on: function(__key, fun, target) {
            var __keys = (__key.indexOf("*") > -1) ? [__key.replace("*", "{_}"), __key.replace("*", "")] : [__key];
            var isHASH = __key.indexOf("#") > -1;
            var isQUERY = __key.indexOf("?") == 0;
            if (isQUERY) {
                var query = URI.decode(__key.slice(1));
                for (var key in query) {
                    var id = counter++;
                    this.paramEventIds.push(id);
                    paramEvents[id] = {
                        name: key, fun: fun
                    };
                }
            } else {
                for (var _i in __keys) {
                    var _key = URI.clean(this.routerBase + __keys[_i]);
                    var paramKeys = (_key.match(/(\{([^}]+)\}|\*)/g) || []).map(function(str) {
                        return str.substring(1, str.length - 1);
                    });
                    var key = refineKey(_key);
                    var keys = splitURL(key);
                    var ref = JQROUTER.onchange_fun;
                    var _nextKey = keys[0];
                    var _key = keys[0];
                    for (var i = 0; i < keys.length; i++) {
                        _key = keys[i];
                        _nextKey = keys[i + 1];
                        _atKey = '@' + _key;
                        ref[_atKey] = ref[_atKey] || {
                            fun: [], ids: [],
                            key: _key, nextKey: _nextKey, next: JQROUTER.next
                        };
                        ref = ref[_atKey];
                    }
                    var id = counter++;
                    ref.fun.push({ cb: fun, id: id, url: __keys[_i], paramKeys: paramKeys, target: target });
                    if (intialized) {
                        JQROUTER._callFun(
                            isHASH ? refineKey(getHash()) :
                                refineKey(document.location.pathname).replace(this.appContext, "/"), id);
                        this.$matched = this.$matched || $matched;
                    }
                    $matched_any = $matched_any || $matched;
                    this.ids.push(id);
                }

            }
            return this;
        },
        off: function() {
            this.unlock();
            for (var i in this.ids) {
                JQROUTER.dead[this.ids[i]] = true;
            }
            for (var i in this.paramEventIds) {
                delete paramEvents[this.paramEventIds[i]];
            }
        },
        otherwise: function(goToURL) {
            var self = this;
            this.onbind(function() {
                if (intialized && (otherWise || !self.$matched) && !$matched_any) {
                    JQROUTER.GO(goToURL);
                } else if (!intialized) {
                    otherwiseURL = goToURL;
                }
            });
            return self;
        },
        defaultRoute: debounce(function(goToURL) {
            if (!this.$matched) {
                this.go(goToURL);
            }
            return this;
        }),
        go: JQROUTER.GO,
        post: function(a, b, c) {
            return JQROUTER.GO(a, c, b);
        },
        reload: JQROUTER.REOLOAD,
        getQueryParam: JQROUTER.GET_PARAM,
        setQueryParam: JQROUTER.SET_PARAM,
        getQueryParams: JQROUTER.GET_PARAMS,
        setQueryParams: JQROUTER.SET_PARAMS,
        getPostParam: function(key) {
            return (postState || {})[key];
        },
        getPostParams: function(key) {
            return postState || {};
        },
        state: function(statename) {
            this._state_.name = this._state_.name || statename;
            this._state_._ = hashStateData[this._state_.name ] || {};
            return this._state_;
        },
        _lock: [],
        lock: function(msg) {
            var lockObject = new RouterLock({
                msg: msg,
                id: this.__id__
            });
            jqr._lock.push(lockObject);
            return lockObject;
        },
        unlock: function() {
            var self = this;
            jqr._lock = jqr._lock.filter(function(obj) {
                return (obj.id != self.__id__);
            });
        },
        locked: function(e) {
            return jqr._lock.length > 0;
        },
        confirm: function(e) {
            if (this.locked() && !window.confirm(jqr._lock[jqr._lock.length - 1].msg)) {
                return preventPropagation(e) || false;
            }
            return true;
        },
        _router_ : function(){
           // console.error("_router_",arguments)
        },
        _ready_: function() {
            var ijqr = this;
            //console.error("_ready_",jQuery)
            var routerQueryParamChange = function(e, _target) {
                var target = e.target || _target;
                var param = target.getAttribute("jqr-" + e.type + "-param");
                if (param) {
                    ijqr.setQueryParam(param, whichDefined(target.getAttribute("jqr-value"), target.value, target.getAttribute("value")));
                }
            };

            var routerQueryParamDataUpdate = function(e, _target) {
                var target = e.target || _target;
                var data = target.dataset;
                if (!is.Empty(data)) {
                    ijqr.setQueryParams(data);
                }
            };
            var routerQueryParamUpdate = function(e, _target) {
                var target = e.target || _target;
                var param = target.getAttribute("jqr-" + e.type + "-params");
                if (param) {
                    var selectedVal = whichDefined(target.getAttribute("jqr-value"), target.value, target.getAttribute("value"));
                    var selected = ijqr.getQueryParam(param) || [];
                    var pos = selected.indexOf(selectedVal);
                }
                if (pos == -1) {
                    selected.push(selectedVal);
                } else {
                    selected.splice(pos, 1);
                }
                ijqr.setQueryParam(param, selected);
                if (target.tagName.toUpperCase() == "A") {
                    return preventPropagation(e);
                }
            };
            window.jQuery("body").on("click", "[jqr-click-param]", routerQueryParamChange);
            window.jQuery("body").on("change", "[jqr-change-param]", routerQueryParamChange);

            window.jQuery("body").on("click", "[jqr-click-params]", routerQueryParamUpdate);
            window.jQuery("body").on("change", "[jqr-change-params]", routerQueryParamUpdate);

            window.jQuery("body").on("click", "[jqr-click-data]", routerQueryParamDataUpdate);
            window.jQuery("body").on("change", "[jqr-change-data]", routerQueryParamDataUpdate);

            window.jQuery("body").on("click", "[jqr-go],[jqr-post]", function(e) {
                var target = this;
                var link = whichDefined(
                        target.getAttribute("jqr-go") || undefined,
                        target.getAttribute("jqr-post") || undefined,
                    target.getAttribute("href"));
                var isPost = target.hasAttribute("jqr-post"), targetValue = target.getAttribute("target");
                var newWindow = (e.metaKey || e.ctrlKey) || targetValue;

                if (!newWindow && !ijqr.confirm(e)) {
                    return false;
                }

                if (link) {
                    if (!newWindow) {
                        jqrouter[isPost ? "post" : "go"](link, jQuery(target).data());
                    }
                }
                if (target.tagName.toUpperCase() == "A") {
                    if (!newWindow) {
                        return preventPropagation(e);
                    }
                } else if (newWindow) {
                    window.open(link, targetValue || '_blank');
                }
            });
        }
    };

    RouterEvent.prototype = jqr;
    return jqr;
});
