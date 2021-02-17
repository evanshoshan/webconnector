let authToken;

(function () {
	var myConnector = tableau.makeConnector();
	myConnector.init = function (initCallback) {
		initCallback();
		tableau.submit();
	};

	myConnector.getSchema = function (schemaCallback) {
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

	// myConnector.init = function (initCallback) {
	// 	// tableau.authType = tableau.authTypeEnum.basic;
	// 	initCallback();
	// }

	myConnector.getData = function (table, doneCallback) {
		$.ajax({
			dataType: "json",
			beforeSend: function (request) {
				//TODO: make auth token dynamic call 
				request.setRequestHeader("Authorization", 'Bearer 9w920jpwRLneVxp4jn36gRzo0GMA9SrnrMeyoW_envlu6rh8y4fd1pYMoSfSs9GqKSH7KCXUFS5dnpfi4Kapug');
			},
			url: 'https://api.mypurecloud.com/api/v2/telephony/providers/edges/trunks/38ad39c0-eaf0-44f2-bb72-c1c1de690c54/metrics',
			success: function (resp) {
				let tableData = [];
				tableau.log(resp);
				
				// for (var i = 0, len = trunk.length; i < len; i++) {
				tableData.push({
					"trunkId": resp.trunk.id,
					"inboundCallCount": resp.calls.inboundCallCount,
					"outboundCallCount": resp.calls.outboundCallCount,
					"mismatchCount": resp.qos.mismatchCount
				});
				// }

				table.appendRows(tableData);
				doneCallback();
			},
			error: function (resp) {
				console.log(resp);
			}
		});
	};


	tableau.registerConnector(myConnector);
})();

// $(document).ready(function () {
// 	$("#submitButton").click(function () {
// 		console.log('submit')
// 		tableau.connectionName = "USGS Earthquake Feed";
// 		authToken = $("#authToken")[0].value
// 		console.log("Auth token is: " + authToken)
// 		tableau.submit();
// 	});
// });
