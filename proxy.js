"use strict";
exports.__esModule = true;
var express = require("express");
var uws_1 = require("uws");
var http = require("http");
var net = require("net");
var dgram = require("dgram");
var node_fetch_1 = require("node-fetch");
var compression = require("compression");
var bodyParser = require("body-parser");
var errorMsgHandler = require("./errorMsgHandler");
var server = http.createServer();
var wss = new uws_1.Server({ server: server });
var app = express();
// 添加json解析
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/', express.static(__dirname));
app.disable('x-powered-by');
app.use(compression());
var toUrlHeaderName = 'x-to-url';
var headersName = 'x-headers';
app.all('/proxy', function (request, proxyResponse) {
    ////console.log('/proxy')
    var url = request.header(toUrlHeaderName);
    //console.log(url)
    if (!url) {
        proxyResponse.send("No header: " + toUrlHeaderName);
    }
    else {
        var chunks_1 = [];
        request.on('data', function (chunk) {
            chunks_1.push(chunk);
        });
        request.on('end', function () {
            var headerString = request.header(headersName);
            if (!headerString) {
                return;
            }
            var headerArray = JSON.parse(headerString);
            var headers = {};
            for (var _i = 0, headerArray_1 = headerArray; _i < headerArray_1.length; _i++) {
                var header = headerArray_1[_i];
                headers[header.key] = header.value;
            }
            node_fetch_1["default"](url, {
                headers: headers,
                body: Buffer.concat(chunks_1),
                method: request.method,
                compress: false
            }).then(function (response) {
                response.headers.forEach(function (value, name) {
                    proxyResponse.setHeader(name, value);
                });
                response.buffer().then(function (buffer) {
                    proxyResponse.status(response.status).send(buffer);
                }, function (error) {
                    proxyResponse.status(response.status).send(error.message);
                });
            }, function (error) {
                proxyResponse.send(error.message);
            });
        });
    }
});
app.post('/saveErrorMsg', function (req, res) {
    console.log(req.body);
    errorMsgHandler.add(req.body, function (err) {
        if (err) {
            res.json({
                status: 400,
                msg: '保存数据失败'
            });
        }
        else {
            res.json({
                status: 200,
                msg: '保存数据成功'
            });
        }
    });
});
app.get('/getErrorMsg', function (req, res) {
    errorMsgHandler.get(req.query.currentPage, req.query.pageSize, req.query.serialNumber, function (err, result) {
        if (err) {
            res.json({
                status: 400,
                msg: '获取数据失败'
            });
        }
        else {
            res.json({
                status: 200,
                msg: '获取数据成功',
                data: result.data,
                total: result.total,
                currentPage: req.query.currentPage,
                pageSize: req.query.pageSize
            });
        }
    });
});
wss.on('connection', function (ws) {
    var tcpClient;
    var udpClient = dgram.createSocket('udp4');
    //console.log('connection')
    udpClient.on('message', function (msg, rinfo) {
        //console.log('msg', msg)
        ws.send(msg);
    });
    ws.on('message', function (data) {
        //console.log('data', data)
        var protocol = JSON.parse(data);
        if (protocol.kind === "tcp:connect" /* tcpConnect */) {
            if (tcpClient) {
                tcpClient.destroy();
            }
            tcpClient = net.connect(protocol.port, protocol.host, function () {
                var responseProtocol = {
                    kind: "tcp:connected" /* tcpConnected */
                };
                ws.send(JSON.stringify(responseProtocol));
            });
            tcpClient.on('close', function (hadError) {
                var responseProtocol = {
                    kind: "tcp:disconnected" /* tcpDisconnected */
                };
                ws.send(JSON.stringify(responseProtocol));
            });
            tcpClient.on('error', function (error) {
                ws.send("errored: " + error.stack);
            });
            tcpClient.on('timeout', function () {
                ws.send('timeout');
            });
            tcpClient.on('data', function (tcpData) {
                //console.log('tcpData', tcpData)
                ws.send(tcpData, { binary: true });
            });
        }
        else if (protocol.kind === "tcp:disconnect" /* tcpDisconnect */) {
            if (tcpClient) {
                tcpClient.destroy();
            }
        }
        else if (protocol.kind === "tcp:send" /* tcpSend */) {
            if (tcpClient) {
                var message = protocol.isBinary ? new Buffer(protocol.message.split(',')) : protocol.message;
                tcpClient.write(message);
            }
        }
        else if (protocol.kind === "udp:send" /* udpSend */) {
            var message = protocol.isBinary ? new Buffer(protocol.message.split(',')) : protocol.message;
            udpClient.send(message, protocol.port, protocol.address);
        }
    });
});
server.on('request', app);
var port = 12345;
server.listen(port, function () {
    console.log("The proxy is running, and listening: " + port);
});
