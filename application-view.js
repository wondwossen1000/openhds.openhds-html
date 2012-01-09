  (function(openhdsContext) {
    var onlineModeBtn = $("#onlineModeBtn");
    var offlineModeBtn = $("#offlineModeBtn");
    
    $(onlineModeBtn).click(function(evt) {
      if (!$(this).hasClass("grey-button-active")) {
        $(offlineModeBtn).removeClass("grey-button-active").addClass("grey-button-inactive");
        $(this).addClass("grey-button-active");
      }
    });
    
    $(offlineModeBtn).click(function(evt) {
      if (!$(this).hasClass("grey-button-active")) {
        $(onlineModeBtn).removeClass("grey-button-active").addClass("grey-button-inactive");
        $(this).addClass("grey-button-active");
      }
    });
    
    $("#retrieveBaseData").click(function(evt) {
      evt.preventDefault();
      openhdsContext.fireEvent(openhdsContext.events.GET_LOCATION_DATA);
    });
    
    $("#clearStorageBtn").click(function(evt) {
      evt.preventDefault();
      openhdsContext.fireEvent(openhdsContext.events.CLEAR_DATA);
    });
    
    $("#selectTargetLocations").click(function(evt) {
      evt.preventDefault();
      var selected = $("#targetLocationForm").serializeArray();
      if (selected.length == 0) {
        $("#selectedTargetErrorLbl").html("You must select at least 1 location");
      } else {
        $("#selectedTargetErrorLbl").html("");
      }
      var extIds = [];
      for (var i = 0; i < selected.length; i++) {
        extIds.push(selected[i].value);
      }
      
      openhdsContext.fireEvent(openhdsContext.events.GET_INDIVIDUALS, extIds);
    });
    
    $("#deathEventBtn").click(function(evt) {
      evt.preventDefault();
      $("#registerDeathForm").css("display", "block");
      $("#eventSelectionForm").css("display", "none");
    });
    
    function showApplicationPane() {
      $("#applicationPane").css("display", "block");
      $("#needDataDialog").css("display", "none");
    }
    
    function hideApplicationPane() {
      $("#applicationPane").css("display", "none");
      $("#needDataDialog").css("display", "block");    
    }
    
    function processData(openhdsContext) {
      var storage = openhdsContext.storage;
      populateLocations(storage.allLocations());
      $("#selectLocationForm").css("display", "block");
      $("#targetLocationForm").css("display", "none");
      showApplicationPane();
    }
    
    function populateLocations(locations) {
      var eles = [];
      for(var i = 0; i < locations.length; i++) {
        eles.push("<li><a href=\"#\" list-key=\"" + locations[i].key + "\" class=\"list-item-button\">");
        eles.push(locations[i].key);
        eles.push("</a></li>");
      }
      $("#locationList").html(eles.join(''));
      $("#locationList .list-item-button").click(function(evt) {
        var key = $(this).attr("list-key");
        $("#selectLocationForm").css("display", "none");
        openhdsContext.tx.start(key);
      });
    }
    
    function populateVisits(visits) {
      var eles = [];
      eles.push("<li><a href=\"#\" list-key=\"new\" class=\"list-item-button\">New Visit</a></li>");
      
      $("#visitList").html(eles.join(''));
    }
    
    function showLocationTargetList(openhdsContext, locations) {
      var ele = [];
      for (var i = 0; i < locations.length; i++) {
        ele.push("<tr><td><input type=\"checkbox\" id=\"loc");
        ele.push(i);
        ele.push("\" name=\"loc");
        ele.push(i);
        ele.push("\" value=\"");
        ele.push(locations[i].extId);
        ele.push("\" /></td><td><label for=\"loc");
        ele.push(i);
        ele.push("\">");
        ele.push(locations[i].extId);
        ele.push("</label></td></tr>");
      }
      $("#targetLocationTableBody").html('').append(ele.join(""));
      $("#targetLocationForm").css("display", "block");
      showApplicationPane();
    }
    
    function hideLoadingIndicator() {
      $("#loadingIndicatorDialog").css("visibility", "hidden");
    }
    
    function showOffline() {
      $("#onlineStatusLbl").css("color", "red").html("Offline");
    }
    
    function showOnline() {
      $("#onlineStatusLbl").css("color", "").html("Online");
    }
    
    function showLoadingDialog(openhdsContext, loadingMsg) {
      $("#loadingIndicatorDialog").css("visibility", "visible");
      if (loadingMsg) {
        $("#loadingMsgLbl").html(loadingMsg);
      } else {
        $("#loadingMsgLbl").html("Loading...");
      }
    }
    
    function startTransaction(openhdsContext, location) {
      $("#eventSelectionForm").css("display", "block");
    }
      
    openhdsContext.subscribeTo(openhdsContext.events.LOCAL_DATA_AVAILABLE, processData);
    openhdsContext.subscribeTo(openhdsContext.events.LOCATION_DATA, showLocationTargetList);
    openhdsContext.subscribeTo(openhdsContext.events.CLEAR_DATA, hideApplicationPane);
    openhdsContext.subscribeTo(openhdsContext.events.NETWORK_OP_START, showLoadingDialog);
    openhdsContext.subscribeTo(openhdsContext.events.NETWORK_OP_STOP, hideLoadingIndicator);
    openhdsContext.subscribeTo(openhdsContext.events.NETWORK_UNAVAILABLE, showOffline);
    openhdsContext.subscribeTo(openhdsContext.events.NETWORK_AVAILABLE, showOnline);
    openhdsContext.subscribeTo(openhdsContext.events.TRANSACTION_START, startTransaction);
    
  })(openhdsContext);