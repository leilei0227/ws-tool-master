/**
 * zll
 */
let vm;
$(function() {
	const serverUrl = "http://106.12.153.196:12345"

	vm = new Vue({
		el: "#app",
		data: {
			ipPort: [], // ip端口列表
			ipPortErr: "", //ip端口错误信息
			confirmMsg: '你确认要删除吗？', //确认信息
			alertMsg: '',
			currentId: 0,
			op: 'add'
		},
		methods: {
			// 情况表单
			clearform: function() {
				$('#addModal [name="id"]').val("")
				$('#addModal [name="ip"]').val("")
				$('#addModal [name="port"]').val("")
			},
			// 得到ip端口列表
			getIpPorts: function() {
				var that = this
				$.getJSON(serverUrl + "/getIpPorts")
					.success(function(data) {
						console.log(typeof data);
						console.log(data.data instanceof Array);
						console.log(data.data);
						that.ipPort = data.data
						
						console.log(that.ipPort);
					})
					.error(function(err) {
						that.alertMsg = err
						$("#alertModal").modal('show')
					})
			},
			// 根据id得到ip端口
			getIpPortById: function(id) {
				const that = this
				$.get(serverUrl + "/getIpPortById?id=" + id)
					.success(function(data) {
						var obj = data.data
						$('#addModal [name="id"]').val(obj.id)
						$('#addModal [name="ip"]').val(obj.ip)
						$('#addModal [name="port"]').val(obj.port)
					})
					.error(function(err) {
						that.alertMsg = err
						$("#alertModal").modal('show')
					})
			},
			// 添加ip端口列表
			saveIpPort: function() {
				// 判断数据正确吗
				const obj = checkIpPort()
				if ($.isEmptyObject(obj)) return
				const that = this

				let url = ""
				if (that.op === 'add') {
					url = serverUrl + "/addIpPort"
				} else if (that.op === 'update') {
					url = serverUrl + "/updateIpPort"
				}
				$.ajax({
						type: "POST",
						url: url,
						data: JSON.stringify(obj),
						contentType: 'application/json;charset=utf-8'
					})
					.success(function(data) {
						that.alertMsg = data.msg
						$("#addModal").modal('hide')
						$("#alertModal").modal('show')
						that.getIpPorts()
					})
					.error(function() {
						that.alertMsg = err.msg
						$("#addModal").modal('hide')
						$("#alertModal").modal('show')
					})
			},
			// 删除ip端口列表
			delIpPort: function() {
				const that = this
				$.get(serverUrl + "/delIpPort?id=" + that.currentId)
					.success(function(data) {
						that.alertMsg = data.msg
						$("#confirmModal").modal('hide')
						$("#alertModal").modal('show')
						that.getIpPorts()
					})
					.error(function() {
						that.alertMsg = err.msg
						$("#alertModal").modal('show')
					})
			}
		},
		created: function() {
			var that = this
			setTimeout(function() {
				that.getIpPorts()
			}, 200);
		}
	})


	function checkIpPort(op) {
		const ipPattern = /^((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}$/
		const portPattern = /^([0-9]|[1-9]\d{1,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/

		const id = $('#addModal [name="id"]').val()
		const ip = $('#addModal [name="ip"]').val()
		const port = $('#addModal [name="port"]').val()

		if (!ip.match(ipPattern)) {
			vm.ipPortErr = 'IP地址格式错误'
			return {}
		}
		if (!port.match(portPattern)) {
			vm.ipPortErr = '端口号格式错误'
			return {}
		}

		let obj = {
			ip: ip,
			port: port
		}

		if (vm.op === "update") obj.id = id

		return obj
	}
})
