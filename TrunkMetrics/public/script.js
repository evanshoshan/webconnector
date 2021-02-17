(function() {
  'use strict';

  // This config stores the important strings needed to
  // connect to the foursquare API and OAuth service
  //
  // Storing these here is insecure for a public app
  // See part II. of this tutorial for an example of how
  // to do a server-side OAuth flow and avoid this problem
  var config = {
      clientId: '6891e54b-ff96-426d-bffe-f871dabb2947',
      redirectUri: 'http://localhost:3333/redirect',
      authUrl: 'https://login.mypurecloud.com/',
      version: '20190102'
  }; 

  // Called when web page first loads and when
  // the OAuth flow returns to the page
  //
  // This function parses the access token in the URI if available
  // It also adds a link to the foursquare connect button
  $(document).ready(function() {
      var accessToken = Cookies.get("accessToken");
      var hasAuth = accessToken && accessToken.length > 0;
      updateUIWithAuthState(hasAuth);

      $("#connectbutton").click(function() {
          doAuthRedirect();
      });

      $("#getMetrics").click(function() {
          tableau.connectionName = "Foursquare Venues Data";
          tableau.submit();
      });
  });

  // An on-click function for the connect to foursquare button,
  // This will redirect the user to a Foursquare login
  function doAuthRedirect() {
      var appId = config.clientId;
      if (tableau.authPurpose === tableau.authPurposeEnum.ephemerel) {
        appId = config.clientId;  // This should be Desktop
      } else if (tableau.authPurpose === tableau.authPurposeEnum.enduring) {
        appId = config.clientId; // This should be the Tableau Server appID
      }

      var url = config.authUrl + 'oauth/authorize?response_type=code&client_id=' + appId +
              '&redirect_uri=' + config.redirectUri;
      window.location.href = url;
  }

  //------------- OAuth Helpers -------------//
  // This helper function returns the URI for the venueLikes endpoint
  // It appends the passed in accessToken to the call to personalize the call for the user
  function getMetricsUri(accessToken) {
      return "https://api.foursquare.com/v2/users/self/venuelikes?oauth_token=" +
              accessToken + "&v=" + config.version;
  }

  // This function toggles the label shown depending
  // on whether or not the user has been authenticated
  function updateUIWithAuthState(hasAuth) {
      if (hasAuth) {
          $(".notsignedin").css('display', 'none');
          $(".signedin").css('display', 'block');
      } else {
          $(".notsignedin").css('display', 'block');
          $(".signedin").css('display', 'none');
      }
  }

  //------------- Tableau WDC code -------------//
  // Create tableau connector, should be called first
  var myConnector = tableau.makeConnector();

  // Init function for connector, called during every phase but
  // only called when running inside the simulator or tableau
    myConnector.init = function (initCallback) {
      tableau.authType = tableau.authTypeEnum.custom;

      // If we are in the auth phase we only want to show the UI needed for auth
      if (tableau.phase == tableau.phaseEnum.authPhase) {
        $("#getMetrics").css('display', 'none');
      }

      if (tableau.phase == tableau.phaseEnum.gatherDataPhase) {
        // If the API that WDC is using has an endpoint that checks
        // the validity of an access token, that could be used here.
        // Then the WDC can call tableau.abortForAuth if that access token
        // is invalid.
      }

      var accessToken = Cookies.get("accessToken");
      console.log("Access token is '" + accessToken + "'");
      var hasAuth = (accessToken && accessToken.length > 0) || tableau.password.length > 0;
      updateUIWithAuthState(hasAuth);

      initCallback();

      // If we are not in the data gathering phase, we want to store the token
      // This allows us to access the token in the data gathering phase
      if (tableau.phase == tableau.phaseEnum.interactivePhase || tableau.phase == tableau.phaseEnum.authPhase) {
          if (hasAuth) {
              tableau.password = accessToken;
              if (tableau.phase == tableau.phaseEnum.authPhase) {
                // Auto-submit here if we are in the auth phase
                tableau.submit()
              }
              return;
          }
      }
  };

  // Declare the data to Tableau that we are returning from Foursquare
  myConnector.getSchema = function(schemaCallback) {
      var cols = [{
          id: "trunkId",
          dataType: tableau.dataTypeEnum.string
      }, {
          id: "inboundCallCount",
          alias: "Inbound Call Count",
          dataType: tableau.dataTypeEnum.float
      }, {
          id: "outboundCallCount",
          dataType: tableau.dataTypeEnum.float
      }, {
          id: "mismatchCount",
          dataType: tableau.dataTypeEnum.float
      }];

      var tableSchema = {
          id: "trunkMetrics",
          alias: "Trunk Metrics",
          columns: cols
      };

      schemaCallback([tableSchema]);
  };

  // This function actually make the foursquare API call and
  // parses the results and passes them back to Tableau
myConnector.getData = function (table, doneCallback) {
        var dataToReturn = [];
        var hasMoreData = false;
        
        var accessToken = tableau.password;
        // var connectionUri = getVenueLikesURI(accessToken);
        var url = 'https://api.mypurecloud.com/api/v2/telephony/providers/edges/trunks/38ad39c0-eaf0-44f2-bb72-c1c1de690c54/metrics'
        
        var xhr = $.ajax({
            dataType: "json",
            url: url,
            beforeSend: function (request) {
                //TODO: make auth token dynamic call 
                request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
            },
            success: function (data) {
                if (data) {
                    tableau.log(data);

                    // for (var i = 0, len = trunk.length; i < len; i++) {
                    dataToReturn.push({
                        "trunkId": data.trunk.id,
                        "inboundCallCount": data.calls.inboundCallCount,
                        "outboundCallCount": data.calls.outboundCallCount,
                        "mismatchCount": data.qos.mismatchCount
                    });
                    // }

                    table.appendRows(dataToReturn);
                    doneCallback();
                } else {
                    tableau.abortWithError("No results found");
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                tableau.abortForAuth("Invalid Access Token");
            }
      });
  };

  // Register the tableau connector, call this last
  tableau.registerConnector(myConnector);
})();
