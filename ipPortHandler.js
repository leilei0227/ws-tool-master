/**
 * @author zll
 */
const mysql = require('mysql');

const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'soan8L6@1234',
	database: 'ws_tool'
});

function IpPort(id, ip, port) {
	this.id = id
	this.ip = ip
	this.port = port
}

const ipPortHandler = {
	// 连接数据库
	connect: function() {
		connection.connect()
	},
	// 断开数据库
	end: function() {
		connection.end()
	},
	// 查询
	get: function(callback) {
		connection.query('select * from ip_port', function(err, results, fields) {
			if (err) {
				callback(err.message)
				return
			};
			let arr = []
			for (let i = 0, len = results.length; i < len; i++) {
				let item = results[i]
				arr.push(new IpPort(item.id, item.ip, item.port))
			}
			callback(null, arr)
		});
	},
	// 根据id得到ip端口
	getById: function(id, callback) {
		connection.query('select * from ip_port where id=' + id, function(err, results, fields) {
			if (err) {
				callback(err.message)
				return
			};
			let obj = null

			if(results.length) {
				let item = results[0]
				obj = new IpPort(item.id, item.ip, item.port)
			}
			
			callback(null, obj)
		});
	},
	// 添加
	add: function(ipPort, callback) {
		const addSql = 'insert into ip_port(ip, port) VALUES( ?,?)';
		const addSqlParams = [ipPort.ip, ipPort.port];
		//增
		connection.query(addSql, addSqlParams, function(err, result) {
			if (err) {
				callback(err.message)
				return
			}
			callback(null)
		});
	},
	// 更改数据
	update: function(ipPort, callback) {
		const modSql = 'update ip_port set ip=?, port=? where id=?';
		const modSqlParams = [ipPort.ip, ipPort.port, ipPort.id];
		//改
		connection.query(modSql, modSqlParams, function(err, result) {
			if (err) {
				callback(err.message)
				return;
			}
			callback(null)
		});
	},
	// 删除数据
	delete: function(id, callback) {
		var delSql = 'delete from ip_port where id=' + id;
		//删
		connection.query(delSql, function(err, result) {
			if (err) {
				callback(err.message)
				return;
			}
			callback(null)
		});
	}
}

module.exports = ipPortHandler
