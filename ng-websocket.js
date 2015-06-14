'use strict';
(function() {
    function $websocketService(cfg, $http, $rootScope) {
        var wss = this;
        wss.$$websocketList = {};
        wss.$$config = cfg || {};
        wss.$get = function(url) {
            return wss.$$websocketList[url];
        };
        wss.$new = function(cfg) {
            cfg = cfg || {};
            // Url or url + protocols initialization
            if (typeof cfg === 'string') {
                cfg = {
                    url: cfg
                };
                // url + protocols
                if (arguments.length > 1) {
                    if (typeof arguments[1] === 'string' && arguments[1].length > 0) cfg.protocols = [arguments[1]];
                    else if (typeof arguments[1] === 'object' && arguments[1].length > 0) cfg.protocols = arguments[1];
                }
            }
            // If the websocket already exists, return that instance
            var ws = wss.$get(cfg.url);
            if (typeof ws === 'undefined') {
                var wsCfg = angular.extend({}, wss.$$config, cfg);
                ws = new $websocket(wsCfg, $http, $rootScope);
                wss.$$websocketList[wsCfg.url] = ws;
            }
            return ws;
        };
    }

    function $websocket(cfg, $http, $rootScope) {
        var me = this;
        console.debug("ROOTSCOPE", $rootScope);

        function safeDigest() {
            if (!$rootScope.$$phase) {
                $rootScope.$digest();
            }
        }
        if (typeof cfg === 'undefined' || (typeof cfg === 'object' && typeof cfg.url === 'undefined')) throw new Error('An url must be specified for WebSocket');
        me.$$eventMap = {};
        me.$$ws = undefined;
        me.$$reconnectTask = undefined;
        me.$$reconnectCopy = true;
        me.$$queue = [];
        me.$$config = {
            url: undefined,
            lazy: false,
            reconnect: true,
            reconnectInterval: 2000,
            enqueue: false,
            protocols: null,
            maxTries: 10,
            reconnectAttempts: 10
        };
        me.$$fireEvent = function() {
            var args = [];
            Array.prototype.push.apply(args, arguments);
            var event = args.shift(),
                handlers = me.$$eventMap[event];
            if (typeof handlers !== 'undefined') {
                for (var i = 0; i < handlers.length; i++) {
                    if (typeof handlers[i] === 'function') handlers[i].apply(me, args);
                }
            }
        };
        me.$$init = function(cfg) {
            if (cfg.protocols) {
                me.$$ws = new WebSocket(cfg.url, cfg.protocols);
            } else {
                me.$$ws = new WebSocket(cfg.url);
            }
            me.$$ws.onmessage = function(message) {
                try {
                    var decoded = JSON.parse(message.data);
                    me.$$fireEvent('$message', decoded);
                    safeDigest();
                } catch (e) {
                    me.$$fireEvent('$error', e);
                    safeDigest();
                }
            };
            me.$$ws.onerror = function(error) {
                me.$$fireEvent('$error', error);
                safeDigest();
            };
            me.$$ws.onopen = function() {
                // Clear the reconnect task if exists
                if (me.$$reconnectTask) {
                    clearInterval(me.$$reconnectTask);
                    me.$$config.reconnectAttempts = me.$$config.maxTries;
                    //RESETTO NUMERO MAX DI TENTATIVI
                    delete me.$$reconnectTask;
                }
                // Flush the message queue
                if (me.$$config.enqueue && me.$$queue.length > 0) {
                    while (me.$$queue.length > 0) {
                        if (me.$ready()) me.$$send(me.$$queue.shift());
                        else break;
                    }
                }
                me.$$fireEvent('$open');
                safeDigest();
            };
            me.$$ws.onclose = function() {
                // Activate the reconnect task
                if (me.$$config.reconnect && me.$$config.reconnectAttempts > 0) {
                    me.$$reconnectTask = setInterval(function() {
                        if (me.$status() === me.$CLOSED && me.$$config.reconnectAttempts > 0) {
                            me.$$config.reconnectAttempts--;
                            me.$open();
                        } else {
                            clearInterval(me.$$reconnectTask);
                        }
                    }, me.$$config.reconnectInterval);
                }
                me.$$fireEvent('$close');
                safeDigest();
            };
            return me;
        };
        me.$CONNECTING = 0;
        me.$OPEN = 1;
        me.$CLOSING = 2;
        me.$CLOSED = 3;
        me.$on = function() {
            var handlers = [];
            Array.prototype.push.apply(handlers, arguments);
            var event = handlers.shift();
            if (typeof event !== 'string' || handlers.length === 0) throw new Error('$on accept two parameters at least: a String and a Function or an array of Functions');
            me.$$eventMap[event] = me.$$eventMap[event] || [];
            for (var i = 0; i < handlers.length; i++) {
                me.$$eventMap[event].push(handlers[i]);
            }
            return me;
        };
        me.$un = function(event) {
            if (typeof event !== 'string') throw new Error('$un needs a String representing an event.');
            if (typeof me.$$eventMap[event] !== 'undefined') delete me.$$eventMap[event];
            return me;
        };
        me.$$send = function(message) {
            if (me.$ready()) me.$$ws.send(JSON.stringify(message));
            else if (me.$$config.enqueue) me.$$queue.push(message);
        };
        me.$emit = function(event, data) {
            if (typeof event !== 'string') throw new Error('$emit needs two parameter: a String and a Object or a String');
            var message = data;
            me.$$send(message);
            return me;
        };
        me.$open = function() {
            me.$$config.reconnect = me.$$reconnectCopy;
            if (me.$status() !== me.$OPEN) me.$$init(me.$$config);
            return me;
        };
        me.$close = function() {
            if (me.$status() !== me.$CLOSED) me.$$ws.close();
            if (me.$$reconnectTask) {
                clearInterval(me.$$reconnectTask);
                delete me.$$reconnectTask;
            }
            me.$$config.reconnect = false;
            return me;
        };
        me.$status = function() {
            if (typeof me.$$ws === 'undefined') return me.$CLOSED;
            else return me.$$ws.readyState;
        };
        me.$ready = function() {
            return me.$status() === me.$OPEN;
        };
        // setup
        me.$$config = angular.extend({}, me.$$config, cfg);
        me.$$reconnectCopy = me.$$config.reconnect;
        if (!me.$$config.lazy) me.$$init(me.$$config);
        return me;
    }
    angular.module('ngWebsocket', [])
    .factory('$websocket', ["$rootScope", function($rootScope) {
        var wsp = this;
        wsp.$$config = {
            lazy: false,
            reconnect: true,
            reconnectInterval: 2000,
            enqueue: false,
            protocols: null
        };
        wsp.$setup = function(cfg) {
            cfg = cfg || {};
            wsp.$$config = angular.extend({}, wsp.$$config, cfg);
            return wsp;
        };
        var wss = {};
        wsp.$get = ['$http', function($http) {
            return new $websocketService(wsp.$$config, $http, $rootScope);
        }];
        return wsp.$get[1]();
    }]);
})();