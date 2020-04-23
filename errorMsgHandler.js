/**
 * @author zll
 */
const mysql = require('mysql');

const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'soan8L6@1234',
	// password: 'root',
	database: 'ws_tool'
});


// { moment: '14:23:53',
//   mainPack: '55 55 20 02 00 22',
//   subPack: '55 55 20 02 17',
//   rawData:
//    '55 55 20 02 00 22 55 55 20 02 18 1b 00 00 00 00 00 00 00 00 00 05 66 f0 c3 07 69 a6 c0 09 67 ac f3 1b 00 73 ',
//   msgStatus: '从站报文错误' }

function ErrorMsg(id, moment, mainPack, subPack, msgStatus, serialNumber) {
	this.id = id
	this.moment = moment
	this.mainPack = mainPack
	this.subPack = subPack
	// this.rawData = rawData
	this.msgStatus = msgStatus
	this.serialNumber = serialNumber
}

// 时间格式化

const errorMsgHandler = {
	// 连接数据库
	connect: function() {
		connection.connect()
	},
	// 断开数据库
	end: function() {
		connection.end()
	},
	// 查询
	get: function(currentPage, pageSize, serialNumber,callback) {
		var start = (currentPage - 1) * pageSize || 0;
		var end = pageSize || 10;

		const sql = "select * ,(select count(*) from tcp_errmsgs) as total from tcp_errmsgs where serialNumber="+serialNumber+" order by id desc limit " +
			start + "," + end;
		// console.log(sql)
		connection.query(sql, function(err, results, fields) {
			// console.log(err, results);
			if (err) {
				callback(err.message)
				return
			};

			let arr = []
			let total = 0
			for (let i = 0, len = results.length; i < len; i++) {
				let item = results[i]
				total = item.total
				arr.push(new ErrorMsg(item.id, item.moment, item.mainPack, item.subPack, item.msgStatus, item.serialNumber))
			}

			callback(null, {
				data: arr,
				total: total
			})
		});
	},
	// 添加
	add: function(errorMsg, callback) {
		//增
		const addSql = 'insert into tcp_errmsgs(moment, mainPack, subPack, msgStatus, serialNumber) VALUES( ?,?,?,?,?)';
		const addSqlParams = [errorMsg.moment, errorMsg.mainPack, errorMsg.subPack, errorMsg.msgStatus, errorMsg.serialNumber];
		connection.query(addSql, addSqlParams, function(err, result) {
			if (err) {
				callback(err.message)
				return
			}
			console.log('保存数据成功');
			callback(null)
		});
	},
}

// errorMsgHandler.add({
// 	mainPack: "55 55 17 02 00 19",
// 	subPack: "55 55 20 02 18",
// 	moment: "2020-04-22 16:14:56",
// 	msgStatus: "从站报文错误",
// 	serialNumber: "1587602429795"
// } ,function(err){
// 	console.log(err);
// })

// errorMsgHandler.get(1, 10, 1587602429795,function (err, data) {
// 	console.log(data);
// })

module.exports = errorMsgHandler
