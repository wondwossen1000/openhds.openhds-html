  var openhdsContext = {};

  (function(openhdsContext) {
    /** Basic event functionality */
    var listeners = {};
    
    openhdsContext.events = {
      LOCAL_DATA_AVAILABLE: "local_data_available", // local data is available
      LOCATION_DATA: "location_data", // location data retrieved
      GET_LOCATION_DATA: "get_location_data", // event to get location data
      GET_INDIVIDUALS: "get_individuals", // event to retrieve individuals
      CLEAR_DATA: "clear_data",
      TRANSACTION_START: "transaction_start",
      
      NETWORK_OP_START: "network_op_start",
      NETWORK_OP_STOP: "network_op_stop",
      NETWORK_AVAILABLE: "network_available",
      NETWORK_UNAVAILABLE: "network_unavailable",
      
      LOCATION_FETCH_FAILURE: "location_fetch_failure",
    };
    
    openhdsContext.subscribeTo = function(evtName, listener, receiver) {
      if (receiver) {
        listener = invokeWithReceiver(receiver, listener);
      }
      
      if (!listeners[evtName]) {
        listeners[evtName] = [];
      }
      
      listeners[evtName].push(listener);
    };
    
    function invokeWithReceiver(receiver, func) {
      return function() {
        func.apply(receiver, arguments);
      };
    }
    
    openhdsContext.fireEvent = function(evtName, data) {
      if (listeners[evtName]) {
        var l = listeners[evtName];
        for(var i = 0; i < l.length; i++) {
          if (!data) {
            l[i](openhdsContext);
          } else {
            l[i](openhdsContext, data);
          }
        }
      }
    }
  })(openhdsContext);
  
  (function(openhdsContext) {
    /** Storage wrapper */
    function Storage() {
      this.locationStorage = new Lawnchair({name: "locations"}, function() {});
      openhdsContext.subscribeTo(openhdsContext.events.CLEAR_DATA, this.clear, this);
    }
    
    Storage.prototype.clear = function() {
      this.locationStorage.nuke();
    }
    
    Storage.prototype.saveLocationData = function(location) {
      this.locationStorage.save(location);
    }
    
    Storage.prototype.getLocation = function(key) {
      var result;
      this.locationStorage.get(key, function(res) { result = res; });
      return result;
    }
    
    Storage.prototype.allLocations = function() {
      var results;
      this.locationStorage.all(function(res) {
        results = res;
      });
      return results;
    }
    
    openhdsContext.storage = new Storage();
  })(openhdsContext);
  
  (function(openhdsContext) {
    /** Handles Networking tasks  */
    function DataRetriever() {
      openhdsContext.subscribeTo(openhdsContext.events.GET_LOCATION_DATA, this.fetchLocations);
      openhdsContext.subscribeTo(openhdsContext.events.GET_INDIVIDUALS, this.fetchIndividuals, this);
    }
    
    DataRetriever.prototype.fetchLocations = function() {
      $.ajax({
        url: "/location-list", 
        success: function(locations) {
          openhdsContext.fireEvent(openhdsContext.events.LOCATION_DATA, locations)
        },
        dataType: "json",
        requestType: "locations", 
        loadingMsg: "Loading Locations..."
      });
    }
    
    DataRetriever.prototype.onIndividualSuccess = function(individuals) {
      var str = openhdsContext.storage;
      for(var i = 0; i < individuals.length; i++) {
        var obj = individuals[i];
        obj.key = obj.location;
        str.saveLocationData(obj);
      }
      openhdsContext.fireEvent(openhdsContext.events.LOCAL_DATA_AVAILABLE);
    }
    
    DataRetriever.prototype.fetchIndividuals = function(openhdsContext, locationExtIds) {
      if (!locationExtIds || locationExtIds.length === undefined || locationExtIds.length == 0) {
        console.log("No location ext id's provided");
        return;
      }
      
      $.ajax({
        url: "/individuals",
        data: "data=" + JSON.stringify(locationExtIds),
        success: this.onIndividualSuccess,
        context: this,
        dataType: "json",
        requestType: "individuals",
        loadingMsg: "Loading Individuals at locations...",
        type: "POST"
      });
    }
    
    DataRetriever.prototype.onNetworkFail = function(event, jqXHR, ajaxSettings, thrownError) {
      if ((thrownError && thrownError === "timeout") || (jqXHR.statusText && jqXHR.statusText === "error")) {
        openhdsContext.fireEvent(openhdsContext.events.NETWORK_UNAVAILABLE);
      }
      
      if (ajaxSettings.requestType === "locations") {
        openhdsContext.fireEvent(openhdsContext.events.LOCATION_FETCH_FAILURE);
      }
      openhdsContext.fireEvent(openhdsContext.events.NETWORK_OP_STOP);
    }
    
    DataRetriever.prototype.onSuccess = function(event, XMLHttpRequest, ajaxOptions) {
      openhdsContext.fireEvent(openhdsContext.events.NETWORK_AVAILABLE);
    }
    
    DataRetriever.prototype.networkStart = function(event, jqXHR, ajaxOptions) {
      openhdsContext.fireEvent(openhdsContext.events.NETWORK_OP_START, ajaxOptions.loadingMsg);
    }
    
    DataRetriever.prototype.networkStop = function() {
      openhdsContext.fireEvent(openhdsContext.events.NETWORK_OP_STOP);
    }

    openhdsContext.net = new DataRetriever();
    $(document).ajaxError(openhdsContext.net.onNetworkFail)
               .ajaxSuccess(openhdsContext.net.onSuccess)
               .ajaxSend(openhdsContext.net.networkStart)
               .ajaxStop(openhdsContext.net.networkStop);
    $.ajaxSetup({
      "timeout": (50 * 1000),
    });
  })(openhdsContext);

  (function(openhdsContext) {
    function Application(storage) {
      this.storage = storage;
      this.online = true;
      openhdsContext.subscribeTo(openhdsContext.events.LOCATION_FETCH_FAILURE, this.locationFetchFailed, this);
      openhdsContext.subscribeTo(openhdsContext.events.NETWORK_UNAVAILABLE, this.onOffline, this);
    }
    
    Application.prototype.onOffline = function() {
      this.online = false;
    }

    Application.prototype.locationFetchFailed = function() {
      if (this.storage.allLocations().length > 0) {
        openhdsContext.fireEvent(openhdsContext.events.LOCAL_DATA_AVAILABLE);
      }
    }
    
    openhdsContext.dataStorge = new Application(openhdsContext.storage);
    
    openhdsContext.app = {
      init: function() {
        openhdsContext.net.fetchLocations()
      }
    };
  })(openhdsContext);
  
  (function(openhdsContext) {
    /** Represents a single field worker visiting a location */
    function Transaction(key) {
      this.location = openhdsContext.storage.getLocation(key);
      openhdsContext.fireEvent(openhdsContext.events.TRANSACTION_START, this.location);
    }
    
    openhdsContext.tx = {
      "start": function(key) {
        this.trans = new Transaction(key);
      }
    };
  })(openhdsContext);