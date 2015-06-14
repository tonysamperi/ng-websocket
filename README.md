ng-websocket
============

**AngularJS HTML5 WebSocket** powerful wrapper module to develop with ease and fun!

# Index

  - [Introduction](#introduction)
  - [Requirements](#requirements)
  - [Usage](#usage)
  - [Tutorial](#tutorial)
  - [Features](#features)
    - [Lazy Initialization](#lazy)
    - [Auto Reconnection](#reconnect)
    - [Enqueue Unsent Messages](#enqueue)
      - [$setup](#setup)
    - [$websocket](#websocket)
      - [$new](#new)
      - [$get](#get)
    - [ngWebsocket](#ngWebsocket)
      - [Constructor](#constructor)
      - [Constants](#constants)
      - [Events](#events)
      - [$on](#on)
      - [$un](#un)
      - [$emit](#emit)
      - [$open](#open)
      - [$close](#close)
      - [$status](#status)
      - [$ready](#ready)
  - [License](#license)

# Introduction

**ngWebsocket** is a library to easily handle with websocket in **AngularJS**.
The upgrade from the original is that I made it a factory, to fix the "$scope doesn't update" problem.
I created a "safeDigest" method, to make sure the view is syncronized with the model.
I also removed the $mock feature, because is pretty useless.
Infact, to simulate a response from the server it's sufficient to trigger a "$message" event.
You can easily achieve this, for instance with a button.

# Requirements

The only requirement needed is [AngularJS](https://angularjs.org/) that you can install it via [Bower](http://bower.io/).

# Usage

Include the ng-websocket.js in your html

```html
<html>
    <head>
        <script src="path-to/js/ng-websocket.js"></script>
    </head>
</html>
```
include it in your angular app
```javascript
    var myAngularApp = angular.module('MyApp', ['ngWebsocket']);
```
finally include the **$websocket** factory in your controller
```javascript
    myAngularApp.controller('MyController', ['$scope', '$websocket',
    function($scope, $websocket) {
```
Now, you're ready to use it!

# Tutorial
In your controller you just have to include the **$websocket** factory and use it like this.

```javascript
myAngularApp.controller('MyController', ['$scope', '$websocket',
    function($scope, $websocket) {
        var ws = $websocket.$new('ws://localhost:12345');
        // instance of ngWebsocket, handled by $websocket service

        ws.$on('$open', function () {
            console.log('Websocket connected!');
            
            //some other actions
        });

    }]);
```
To send data you can use the $emit method. It accepts a string (any string is ok) 
and anything you want to send to your server

```javascript
    ws.$emit('ping', 'hi listening websocket server');
    // send a message to the websocket server
```

To catch data from server you can set a listener like this
(you can change the name of the event at line 79 of ng-websocket.js).

```javascript
    ws.$on('$message', function(response){
        //Do anything with data;
    });
```
Then, to simulate data from server

```javascript
    var data = {
        level: 1,
        text: 'ngWebsocket rocks!',
        array: ['one', 'two', 'three'],
        nested: {
            level: 2,
            deeper: [{
                hell: 'yeah'
            }, {
                so: 'good'
            }]
        }
    };
    
    ws.$emit("$message",data);
    
```
To catch when session close

```javascript
    ws.$on('$close', function () {
        console.log('Connection closed.');
    });

```

# Features

## Lazy

Using basic HTML5 WebSocket object, you experienced that the connection is open immediately, just after the websocket is created with **new** constructor.
By default, the same behaviour is used by ngWebsocket but you can simply change it with this powerful feature:

```javascript
    myAngularApp.controller('MyController', ['$scope', '$websocket', '$timeout'
        function($scope, $websocket, $timeout) {

        var ws = $websocket.$new({
            url: 'ws://localhost:12345',
            lazy: true
        });

        ws.$on('$open', function () {
            console.log('The ngWebsocket has open!'); // It will print after 5 (or more) seconds
        });

        $timeout(function () {
            ws.$open(); // Open the connction only at this point. It will fire the '$open' event
        }, 5000);
    });
```
## Reconnect
The original reconnect feature was a pain in the ass!
In fact it would have tried to connect until closing the page.
So I created a **maxTries** parameter, to set how many times it has to try to reconnect.
If connection's back, maxTries will be reset and in case of connection loss it'll try "maxTries" times to reconnect.

You can also set a **reconnectInterval** parameter, which will set a new timeout for reconnecting attempt.
Default is 2000 (ms)

```javascript
    var ws = $websocket.$new({
        url: 'ws://localhost:12345',
        reconnect: true,
        maxTries: 10,
        reconnectInterval: 500 //optional, if not set, default is 2000
    });

    ws.$on('$open', function () {
        console.log('Connection ok!');
      })
      .$on('$close', function () {
        console.log('Connection lost!');
      });
```
**Pay attention, good sir**: if you close the ngWebsocket with the [**$close**](#close) method, it won't get the connection back
until the [**$open**](#open) is invoked!

**Default: enabled**

## Enqueue

From great powers come great responsability. Keep this in mind while reading this feature.

Sometimes, it would be useful if someone save our websocket communication, especially when the connection is down.
With this powerful feature, it's possible to store every unsent message in a queue and then flush them just the connection get up again.

How? Enabling enqueue feature, of course!

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new({
        url: 'ws://localhost:12345',
        lazy: true,
        enqueue: true
    });

    ws.$emit('dude event', 'hi dude!'); // this message couldn't be forwarded because of the lazy property (the websocket is still closed)

    ws.$on('$open', function () {
        console.log('I\'m sure the above message gets sent before this log is printed in the console ;)');
    });

    ws.$open(); // when the websocket gets open, flushes every message stored in the internal queue
});
```

**BUT** this means that each message is stored into a memory queue and it can get really big, especially if your application sends many messages in a short time slice.

**Default: disabled**

### Constructor

The constructor of the ngWebsocket accepts two kind of parameters:

  - String: the url starting with the WebSocket schema (ws:// or wss://)
  plus an optional String/String[] containing the protocols (this matches
  the WebSocket constructor API)
  - Object: a configuration containing the websocket url

The url is a requirement to create a new ngWebsocket.
An instance is always created with a factory method by the [$websocket](#websocket) service: in fact,
it lets to make different websockets that are pointing to different urls.

Example of a basic instantiation:

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new('ws://localhost:12345', ['binary', 'base64']);
});
```

Using Object configuration:

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new({
        url: 'ws://localhost:12345',
        lazy: false,
        reconnect: true,
        reconnectInterval: 2000,
        enqueue: false,
        protocols: ['binary', 'base64']
    });
});
```

Following the explanation of the configuration object - {Type} PropertyName (default):

  - **{Boolean} lazy (false)**: lazy initialization. A websocket can open the connection when ngWebsocket is instantiated with [$websocket.$new](#new) (false) or afterwards with [$open](#open) (false). For more information see [Features - Lazy Initialization](#lazy)
  - **{Boolean} reconnect (true)**: auto reconnect behaviour. A websocket can try to reopen the connection when is down (true) or stay closed (false). For more information see [Features - Auto Reconnect](#reconnect)
  - **{Number} reconnectInterval (2000)**: auto reconnect interval. By default, a websocket try to reconnect after 2000 ms (2 seconds). For more information see [Features - Auto Reconnect](#reconnect)
  - **{Boolean} enqueue (false)**: enqueue unsent messages. By default, a websocket discards messages when the connection is closed (false) but it can enqueue them and send afterwards the connection gets open back (true). For more information see [Features - Enqueue Unsent Messages](#enqueue)
  - **{String/String[]} (null)**: Either a single protocol string or an array of protocol strings. This is the same as the WebSocket protocols argument.

### Constants

Websocket status constants:

  - **$CONNECTING**: the websocket is trying to open the connection
  - **$OPEN**: the websocket connection is open
  - **$CLOSING**: the websocket connection is closing
  - **$CLOSED**: the websocket connection is closed

### Events

There are custom events fired by ngWebsocket.
They are useful to setup a listener for certain situations and behaviours:

  - **$open**: the websocket gets open
  - **$close**: the websocket gets closed
  - **$error**: an error occurred (callback params: {Error} error)
  - **$message**: the original message sent from the server (callback params: {String} message). Usually, it's a JSON encoded string containing the event to fire and the data to pass ({"event": "an event", "data": "some data"})

The other events are custom events, setup by the user itself.

### $on

Attach one or more handlers to a specific event.

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new('ws://localhost:12345');

    // Single event handler
    ws.$on('my event', function myHandler () {...});

    // Different event handlers
    ws.$on('another event', myHandler, mySecondHandler, myThirdHandler);

    // Different chained event handlers
    ws.$on('third event', function myHandler () {...})
      .$on('third event', function mySecondHandler () {...})
      .$on('third event', function myThirdHandler () {...});
});
```

Now the websocket is listening for 'my event' event and the handler 'myHandler' will be called when that event
is sent by the websocket server. The same thing happens for the other two cases: each event handler is called
one by one, starting from the first one, ending with the last one.

**Usage**

```javascript
$on(event, handler|handlers)
```

**Arguments**

| **Param** | **Type** | **Details** |
| --------- | -------- | ----------- |
| event | String | the event to attach a listener |
| handler/handlers | Function/Function[] | one or more handlers to invoke when the event is fired up |

**Returns**

| **Type** | **Details** |
| -------- | ----------- |
| ngWebsocket | the ngWebsocket |

### $un

Detach a handler from a specific event.

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new('ws://localhost:12345');

    ws.$on('my event', function myHandler () {...});
    ws.$un('my event');
});
```

The above websocket has not listener attached at the end of the execution.


**Usage**

```javascript
$un(event)
```

**Arguments**

| **Param** | **Type** | **Details** |
| --------- | -------- | ----------- |
| event     | String   | the event to detach the listener |

**Returns**

| **Type** | **Details** |
| -------- | ----------- |
| ngWebsocket | the ngWebsocket |

### $emit

Send an event to the websocket server.

It's possible to send a lonely event or attaching some data to it.

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new('ws://localhost:12345');

    ws.$on('$open', function () {
        ws.$emit('lonely event'); // the websocket server will receive only the event name
        ws.$emit('event with data', 'some data'); // it will send the event with 'some data' string
        ws.$emit('with object', {some: 'data'}); // it will send the event with the object JSONified
    });
});
```

It's possible to send both simply (like strings and numbers) and complex data (like objects and arrays).

**Usage**

```javascript
$emit(event, [data])
```

**Arguments**

| **Param** | **Type** | **Details** |
| --------- | -------- | ----------- |
| event     | String   | the event to send |
| data (optional) | String/Number/Object | the data to send with the event |

**Returns**

| **Type** | **Details** |
| -------- | ----------- |
| ngWebsocket | the ngWebsocket |

### $open

Open the websocket connection if it's closed.

```javascript
angular.run(function ($websocket, $timeout) {
    var ws = $websocket.$new({
        url: 'ws://localhost:12345',
        lazy: true
    });

    ws.$on('$open', function () {
        console.log('The websocket now is open');
    });

    $timeout(function () {
        ws.$open(); // it will open the websocket after 5 seconds
    }, 5000);
```

**Usage**

```javascript
$open()
```

**Returns**

| **Type** | **Details** |
| -------- | ----------- |
| ngWebsocket | the ngWebsocket |

### $close

It closes the websocket connection if it's open.

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new(url: 'ws://localhost:12345');

    ws.$on('$open', function () {
        ws.$close(); // it closes the websocket connection
    });

    ws.$on('$close', function () {
        console.log('Connection closed!');
    });
```

**Usage**

```javascript
$close()
```

**Returns**

| **Type** | **Details** |
| -------- | ----------- |
| ngWebsocket | the ngWebsocket |

### $status

It returns the current status of the websocket connection.
It's possible to use the [websocket constants](#constants) to make checks.

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new(url: 'ws://localhost:12345');

    console.log(ws.$status()); // it prints ws.$CONNECTING

    ws.$on('$open', function () {
        console.log(ws.$status()); // it prints ws.$OPEN
        ws.$close(); // it closes the websocket connection
        console.log(ws.$status()); // it prints ws.$CLOSING
    });

    ws.$on('$close', function () {
        console.log(ws.$status()); // it prints ws.$CLOSED
        console.log('Connection closed!');
    });
```

**Usage**

```javascript
$status()
```

**Returns**

| **Type** | **Details** |
| -------- | ----------- |
| Number   | a constant number representing the websocket connection readyState |

### $ready

It returns if the websocket connection is open or closed.

```javascript
angular.run(function ($websocket) {
    var ws = $websocket.$new(url: 'ws://localhost:12345');

    console.log(ws.$ready()); // it prints false

    ws.$on('$open', function () {
        console.log(ws.$ready()); // it prints true
        ws.$close(); // it closes the websocket connection
        console.log(ws.$ready()); // it prints false
    });

    ws.$on('$close', function () {
        console.log(ws.$ready()); // it prints false
        console.log('Connection closed!');
    });
```

**Usage**

```javascript
$ready()
```

**Returns**

| **Type** | **Details** |
| -------- | ----------- |
| Boolean  | true if the connection is OPEN, false otherwise |


# License

Check out LICENSE file (MIT)