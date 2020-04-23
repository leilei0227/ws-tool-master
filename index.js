import * as tslib_1 from "tslib";
import Vue from 'vue';
import Component from 'vue-class-component';
import { Decoder } from 'socket.io-parser';
import Clipboard from 'clipboard';
import * as protobuf from 'protobufjs';
import DNSMessage from 'dns-protocol/browser';
import { appTemplateHtml, appTemplateHtmlStatic } from './variables';
// tslint:disable-next-line:no-unused-expression
new Clipboard('.clipboard');
var pingId;
var decoder = new Decoder();
var previewDecoder = new Decoder();
var parameters = localStorage.getItem('parameters');
var headers = localStorage.getItem('headers');
var bookmarks = localStorage.getItem('bookmarks');
var proxyWebSocket;
var toUrlHeaderName = 'x-to-url';
var headersName = 'x-headers';
function formatTimeNumber(num) {
    return num < 10 ? '0' + num : num.toString();
}
function getNow() {
    var date = new Date();
    return formatTimeNumber(date.getFullYear()) + "-" + formatTimeNumber(date.getMonth() + 1) + "-" + formatTimeNumber(date.getDate()) + " " + formatTimeNumber(date.getHours()) + ":" + formatTimeNumber(date.getMinutes()) + ":" + formatTimeNumber(date.getSeconds());
}
function PrefixInteger(num, length) { return (Array(length).join('0') + num).slice(-length); }
function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    // if (r != null)  return r[2];
    if (r != null)
        return decodeURIComponent(r[2]);
    return null;
}
var stompConnectionMessage = "CONNECT\nlogin:admin\npasscode:admin\naccept-version:1.2,1.1,1.0\nheart-beat:0,0\n\n\0";
var stompSubscriptionMessage = "SUBSCRIBE\nid:sub-0\ndestination:/topic/test_topic\n\n\0";
var stompSendMessage = "SEND\ndestination:/queue/test\ncontent-type:text/plain\n\nhello queue test\n\0";
var socketIOSendMessage = "42[\"a_event\",{\n    \"a_key\":\"a_value\"\n}]";
var bayeuxHandshakeMessage = "[{\n    \"advice\":{ \"timeout\":60000, \"interval\":0 },\n    \"channel\":\"/meta/handshake\",\n    \"ext\":{},\n    \"id\":\"1\",\n    \"minimumVersion\": \"0.9\",\n    \"supportedConnectionTypes\": [\"websocket\"],\n    \"version\": \"1.0\"\n}]";
var bayeuxSubscribeMessage = "[{\n    \"channel\": \"/meta/subscribe\",\n    \"clientId\": \"\",\n    \"id\": \"2\",\n    \"subscription\": \"/test_channel\"\n}]";
var bayeuxPublishMessage = "[{\n    \"channel\": \"/test_channel\",\n    \"clientId\": \"\",\n    \"data\": {},\n    \"id\": \"3\"\n}]";
var bayeuxPingMessage = "[{\n    \"advice\": { \"timeout\": 0 },\n    \"channel\": \"/meta/connect\",\n    \"clientId\": \"\",\n    \"connectionType\": \"websocket\",\n    \"id\": \"4\"\n}]";
var defaultProtobufContent = "package testPackage;\nsyntax = \"proto3\";\nmessage Test {\n    required string data = 1;\n}";
var App = /** @class */ (function (_super) {
    tslib_1.__extends(App, _super);
    function App(options) {
        var _this = _super.call(this, options) || this;
        _this.serverUrl = "http://106.12.153.196:12345";
        _this.messages = [];
        _this.parameters = parameters ? JSON.parse(parameters) : [{ key: 'transport', value: 'websocket' }, { key: 'room', value: 'test' }];
        _this.previewResult = '';
        _this.isPreview = false;
        _this.bookmarks = bookmarks ? JSON.parse(bookmarks) : [];
        _this.isEditing = false;
        _this.bookmarkName = '';
        _this.filter = '';
        _this.filterIsHidden = true;
        _this.stompIsHidden = true;
        _this.protobufIsHidden = true;
        _this.dnsIsHidden = true;
        _this.headers = headers ? JSON.parse(headers) : [{ key: 'Content-Type', value: 'application/json' }];
        _this.socketIOIsHidden = true;
        _this.formDatas = [];
        _this.peerConnection = window.RTCPeerConnection ? new RTCPeerConnection({}) : null;
        _this.dataChannelName = 'my_test_channel';
        _this.sessionDescription = '';
        _this.dataChannelStatus = 'none';
        _this.id = 1;
        _this.bayeuxIsHidden = true;
        _this.useProxy = true;
        _this.protobufType = null;
        _this.dataChannel = null;
        _this.websocket = null;
        _this.isSocketIOInternally = !!localStorage.getItem('isSocketIO');
        _this.ignorePingInternally = !!localStorage.getItem('ignorePing');
        _this.baseUrl = localStorage.getItem('baseUrl') || 'wss://copy.yorkyao.xyz/socket.io/';
        _this.anchor = localStorage.getItem('anchor') || '';
        _this.messageInternally = localStorage.getItem('message') || '';
        // private showRawInternally: boolean = !!localStorage.getItem('showRaw')
        _this.showRawInternally = true;
        _this.showFormattedInternally = !!localStorage.getItem('showFormatted');
        _this.subprotocolInternally = localStorage.getItem('subprotocol') || '';
        _this.protobufContentInternally = localStorage.getItem('protobufContent') || defaultProtobufContent;
        _this.protobufTypePathInternally = localStorage.getItem('protobufTypePath') || 'testPackage.Test';
        _this.dnsTransactionIdInternally = +localStorage.getItem('dnsTransactionId') || 43825;
        _this.dnsQuestionNameInternally = localStorage.getItem('dnsQuestionName') || 'www.example.com';
        _this.messageTypeInternally = localStorage.getItem('messageType') || 'string';
        // private protocolInternally = localStorage.getItem('protocol') || 'WebSocket'
        _this.protocolInternally = localStorage.getItem('protocol') || 'TCP';
        // private hostInternally = localStorage.getItem('host') || 'localhost'
        // private portInternally = +localStorage.getItem('port')! || 9999
        _this.hostInternally = getQueryString('host') || 'localhost'; //zll
        _this.portInternally = +getQueryString('port') || 9999; //zll
        _this.mainPackInternally = getQueryString('main') || ''; //zll
        _this.subPackInternally = getQueryString('sub') || ''; //zll
        _this.timer = null; //zll
        _this.timerInterval = 20; //判断间隔 s
        // errorStatus = 200正常
        // errorStatus = 401主站通讯故障
        // errorStatus = 402主站报文错误
        // errorStatus = 403从站报文错误
        // errorStatus = 501未连接
        // errorStatus = 502已断开
        _this.errorStatus = 501; //zll
        _this.isClosed = true; //zll
        _this.errorObj = {
            "200": "正常",
            "401": "主站通讯故障",
            "402": "主站报文错误",
            "403": "从站报文错误",
            "501": "未连接",
            "502": "已连接",
            "503": "已断开"
        };
        _this.errorMsgs = []; // 前台展示的错误列表
        _this.serialNumber = 0; // 为了只得到本次的错误信息
        _this.showPackDeatil = false; // 是否查看报文
        _this.tcpConnected = false;
        _this.httpMethodInternally = localStorage.getItem('httpMethod') || 'GET';
        _this.isDataChannelConnected = false;
        if (_this.peerConnection) {
            _this.peerConnection.ondatachannel = function (event) {
                event.channel.onopen = function (e) {
                    app.isDataChannelConnected = true;
                    _this.messages.unshift({
                        moment: getNow(),
                        type: 'tips',
                        tips: 'peer connection opened.',
                        id: app.id++
                    });
                };
                event.channel.onclose = function (e) {
                    app.isDataChannelConnected = false;
                    _this.messages.unshift({
                        moment: getNow(),
                        type: 'tips',
                        tips: 'peer connection closed.',
                        id: app.id++
                    });
                };
                event.channel.onmessage = function (e) {
                    _this.onmessage(e);
                };
            };
        }
        return _this;
    }
    Object.defineProperty(App.prototype, "httpMethod", {
        get: function () {
            return this.httpMethodInternally;
        },
        set: function (value) {
            localStorage.setItem('httpMethod', value);
            this.httpMethodInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "host", {
        get: function () {
            return this.hostInternally;
        },
        set: function (value) {
            localStorage.setItem('host', value);
            this.hostInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "port", {
        get: function () {
            return this.portInternally;
        },
        set: function (value) {
            localStorage.setItem('port', String(value));
            this.portInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "mainPack", {
        get: function () {
            return this.mainPackInternally;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "subPack", {
        get: function () {
            return this.subPackInternally;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "protocol", {
        get: function () {
            return this.protocolInternally;
        },
        set: function (value) {
            if (value === 'HTTP' || this.messageType === 'FormData') {
                this.messageType = 'string';
            }
            localStorage.setItem('protocol', value);
            this.protocolInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "messageType", {
        get: function () {
            return this.messageTypeInternally;
        },
        set: function (value) {
            localStorage.setItem('messageType', value);
            this.messageTypeInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "protobufContent", {
        get: function () {
            return this.protobufContentInternally;
        },
        set: function (value) {
            localStorage.setItem('protobufContent', value);
            this.protobufContentInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "protobufTypePath", {
        get: function () {
            return this.protobufTypePathInternally;
        },
        set: function (value) {
            localStorage.setItem('protobufTypePath', value);
            this.protobufTypePathInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "dnsTransactionId", {
        get: function () {
            return this.dnsTransactionIdInternally;
        },
        set: function (value) {
            localStorage.setItem('dnsTransactionId', value.toString());
            this.dnsTransactionIdInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "dnsQuestionName", {
        get: function () {
            return this.dnsQuestionNameInternally;
        },
        set: function (value) {
            localStorage.setItem('dnsQuestionName', value.toString());
            this.dnsQuestionNameInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "filteredMessages", {
        // tslint:disable-next-line:cognitive-complexity
        get: function () {
            var _this = this;
            // const that = this
            // console.log(this.messages);
            // var firstInMsg = true
            return this.messages.filter(function (m) {
                // console.log("m==", m.moment, ' ',m.type, ' ', m.rawData);
                // 接收到数据，并且原始数据rawData不为空  zll
                // if(m.type ==='in' && typeof m.rawData === 'string') {
                // 	m.msgStatus = ''
                // 	m.status = 0
                // 	m.rawData = m.rawData.replace(/^\s*/, '') // 去掉前面的空格
                // 	// if(!m.rawData.startsWith(this.mainPackInternally)) {
                // 	// 	m.msgStatus = '主站报文错误'
                // 	// } else if(!m.rawData.startsWith(this.mainPackInternally + " " + this.subPackInternally)) {
                // 	// 	m.msgStatus = '从站报文错误'
                // 	// }
                // 	if(m.rawData.startsWith(this.mainPackInternally)) {
                // 		if(!m.rawData.startsWith(this.mainPackInternally + " " + this.subPackInternally)) {
                // 			m.msgStatus = '(从站报文错误)'
                // 			m.status = 500
                // 			m.mainPack = this.mainPackInternally
                // 			m.subPack = this.subPackInternally
                // 			if (firstInMsg) that.saveErrorMsg(m)
                // 			// console.log(m);
                // 		} else {
                // 			m.status = 200
                // 			m.msgStatus = '(正常)'
                // 		}
                // 	} 
                // 	firstInMsg = false
                // }
                if (_this.filter) {
                    return (typeof m.rawData === 'string' && m.rawData.indexOf(_this.filter) !== -1)
                        || (typeof m.moment === 'string' && m.moment.indexOf(_this.filter) !== -1)
                        || (typeof m.formattedData === 'string' && m.formattedData.indexOf(_this.filter) !== -1)
                        || (typeof m.type === 'string' && m.type.indexOf(_this.filter) !== -1)
                        || (typeof m.reason === 'string' && m.reason.indexOf(_this.filter) !== -1)
                        || (typeof m.data === 'string' && m.data.indexOf(_this.filter) !== -1)
                        || (typeof m.tips === 'string' && m.tips.indexOf(_this.filter) !== -1);
                }
                else {
                    return true;
                }
            }).slice(0, 100);
        },
        enumerable: true,
        configurable: true
    });
    App.prototype.saveErrorMsg = function (msg) {
        console.log('msg==', msg);
        var config = {
            type: 'post',
            url: this.serverUrl + '/saveErrorMsg',
            data: JSON.stringify(msg),
            params: '' //url传递的参数
        };
        var that = this;
        this.ajax(config, function (res) {
            that.getErrorMsg();
            console.log(res);
            console.log('错误信息保存成功');
        });
    };
    App.prototype.getErrorMsg = function () {
        var that = this;
        var config = {
            type: 'get',
            url: this.serverUrl + '/getErrorMsg',
            data: null,
            params: "currentPage=1&pageSize=10&serialNumber=" + this.serialNumber //url传递的参数
            // dataType: "application/x-www-form-urlencoded"
        };
        // var that = this
        this.ajax(config, function (res) {
            that.errorMsgs = JSON.parse(res).data;
        });
    };
    App.prototype.ajax = function (config, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) {
                callback && callback(xhr.responseText);
            }
        };
        xhr.open(config.type, config.url + "?" + config.params, true);
        // 如果想要使用post提交数据,必须添加此行
        xhr.setRequestHeader("Content-type", "application/json");
        xhr.send(config.data);
    };
    App.prototype.hasError = function () {
        var _this = this;
        this.timer = setTimeout(function () {
            console.log('hasError', new Date());
            console.log(_this.isClosed);
            if (_this.isClosed) {
                return;
            }
            _this.errorStatus = 200; //默认正常
            var msgstr = '';
            for (var i = 0, len = _this.messages.length; i < len; i++) {
                var m = _this.messages[i];
                if (m.type === 'in' && typeof m.rawData === 'string') {
                    if (new Date().getTime() - new Date(m.moment).getTime() > _this.timerInterval * 1000)
                        break;
                    msgstr += m.rawData;
                }
            }
            console.log(msgstr);
            if (!msgstr) {
                _this.errorStatus = 401; //主站通讯故障
                return;
            }
            if (!msgstr.match(_this.mainPackInternally))
                _this.errorStatus = 402; //主站报文错误
            var wholePack = _this.mainPackInternally + " " + _this.subPackInternally;
            if (msgstr.match(_this.mainPackInternally) && !msgstr.match(wholePack))
                _this.errorStatus = 403; //从站报文错误
            if (_this.errorStatus === 401 || _this.errorStatus === 402 || _this.errorStatus === 403) {
                _this.saveErrorMsg({
                    mainPack: _this.mainPackInternally,
                    subPack: _this.subPackInternally,
                    moment: getNow(),
                    msgStatus: _this.errorObj[_this.errorStatus],
                    serialNumber: _this.serialNumber
                });
            }
            _this.hasError();
        }, this.timerInterval * 1000);
    };
    Object.defineProperty(App.prototype, "subprotocol", {
        get: function () {
            return this.subprotocolInternally;
        },
        set: function (value) {
            localStorage.setItem('subprotocol', value);
            this.subprotocolInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "canSaveAsBookmark", {
        get: function () {
            var e_1, _a;
            if (this.bookmarkName.trim() === '') {
                return false;
            }
            try {
                for (var _b = tslib_1.__values(this.bookmarks), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var bookmark = _c.value;
                    if (bookmark.name === this.bookmarkName) {
                        return false;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "isSocketIO", {
        get: function () {
            return this.isSocketIOInternally;
        },
        set: function (value) {
            localStorage.setItem('isSocketIO', value ? '1' : '');
            this.isSocketIOInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "ignorePing", {
        get: function () {
            return this.ignorePingInternally;
        },
        set: function (value) {
            localStorage.setItem('ignorePing', value ? '1' : '');
            this.ignorePingInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "showRaw", {
        get: function () {
            return this.showRawInternally;
        },
        set: function (value) {
            localStorage.setItem('showRaw', value ? '1' : '');
            this.showRawInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "showFormatted", {
        get: function () {
            return this.showFormattedInternally;
        },
        set: function (value) {
            localStorage.setItem('showFormatted', value ? '1' : '');
            this.showFormattedInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "message", {
        get: function () {
            return this.messageInternally;
        },
        set: function (value) {
            localStorage.setItem('message', value);
            this.messageInternally = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "url", {
        get: function () {
            var e_2, _a;
            var url = this.baseUrl;
            if (this.parameters.length > 0) {
                url += '?';
                try {
                    for (var _b = tslib_1.__values(this.parameters), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var parameter = _c.value;
                        url += parameter.key + '=' + parameter.value + '&';
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                url = url.substring(0, url.length - 1);
            }
            if (this.anchor) {
                url += '#' + this.anchor;
            }
            return url;
        },
        set: function (value) {
            var e_3, _a;
            var index = value.indexOf('#');
            if (index > -1) {
                value = value.substring(0, index);
                this.anchor = value.substring(index + 1);
            }
            else {
                this.anchor = '';
            }
            index = value.indexOf('?');
            if (index > -1) {
                this.baseUrl = value.substring(0, index);
                var array = value.substring(index + 1).split('&');
                var newParameters = [];
                try {
                    for (var array_1 = tslib_1.__values(array), array_1_1 = array_1.next(); !array_1_1.done; array_1_1 = array_1.next()) {
                        var tmp = array_1_1.value;
                        index = tmp.indexOf('=');
                        if (index === -1) {
                            newParameters.push({
                                key: tmp,
                                value: ''
                            });
                        }
                        else {
                            newParameters.push({
                                key: tmp.substring(0, index),
                                value: tmp.substring(index + 1)
                            });
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (array_1_1 && !array_1_1.done && (_a = array_1.return)) _a.call(array_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                this.parameters = newParameters;
            }
            else {
                this.baseUrl = value;
                this.parameters = [];
            }
            localStorage.setItem('baseUrl', this.baseUrl);
            localStorage.setItem('parameters', JSON.stringify(this.parameters));
            localStorage.setItem('anchor', this.anchor);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "isConnected", {
        get: function () {
            return (this.protocol === 'WebSocket' && this.websocket)
                || (this.protocol === 'TCP' && this.tcpConnected)
                || (this.protocol === 'WebRTC' && this.dataChannel && this.isDataChannelConnected);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "isDisconnected", {
        get: function () {
            return (this.protocol === 'WebSocket' && !this.websocket)
                || (this.protocol === 'TCP' && !this.tcpConnected)
                || (this.protocol === 'WebRTC' && !(this.dataChannel && this.isDataChannelConnected));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "shouldContainBody", {
        get: function () {
            return this.httpMethod === 'POST'
                || this.httpMethod === 'PUT'
                || this.httpMethod === 'PATCH'
                || this.httpMethod === 'DELETE'
                || this.httpMethod === 'LINK'
                || this.httpMethod === 'UNLINK';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(App.prototype, "shouldShowMessageTextarea", {
        get: function () {
            return (this.messageType === 'string' || this.protocol !== 'HTTP') && this.dnsIsHidden;
        },
        enumerable: true,
        configurable: true
    });
    App.prototype.createDataChannel = function () {
        if (!this.peerConnection) {
            return;
        }
        this.dataChannel = this.peerConnection.createDataChannel(this.dataChannelName);
        this.dataChannelStatus = 'init';
        this.messages.unshift({
            moment: getNow(),
            type: 'tips',
            tips: "create data channel successfully: " + this.dataChannelName,
            id: this.id++
        });
    };
    App.prototype.createOffer = function () {
        var _this = this;
        if (!this.peerConnection) {
            return;
        }
        this.peerConnection.createOffer()
            .then(function (offer) { return _this.peerConnection.setLocalDescription(offer); })
            .then(function () {
            _this.showLocalDescription();
            _this.dataChannelStatus = 'created offer';
        }, function (error) {
            _this.showError(error);
        });
    };
    App.prototype.answerOffer = function () {
        var _this = this;
        if (!this.peerConnection) {
            return;
        }
        try {
            var offer = new RTCSessionDescription(JSON.parse(this.sessionDescription));
            this.peerConnection.setRemoteDescription(offer)
                .then(function () { return _this.peerConnection.createAnswer(); })
                .then(function (answer) { return _this.peerConnection.setLocalDescription(answer); })
                .then(function () {
                _this.showLocalDescription();
                _this.dataChannelStatus = 'answered offer';
            }, function (error) {
                _this.showError(error);
            });
        }
        catch (error) {
            this.showError(error);
        }
    };
    App.prototype.setAnswer = function () {
        var _this = this;
        if (!this.peerConnection) {
            return;
        }
        try {
            var answer = new RTCSessionDescription(JSON.parse(this.sessionDescription));
            this.peerConnection.setRemoteDescription(answer)
                .then(function () {
                _this.messages.unshift({
                    moment: getNow(),
                    type: 'tips',
                    tips: 'set answer successfully.',
                    id: _this.id++
                });
                _this.dataChannelStatus = 'set answer';
            }, function (error) {
                _this.showError(error);
            });
        }
        catch (error) {
            this.messages.unshift({
                moment: getNow(),
                type: 'error',
                reason: error.message,
                id: this.id++
            });
        }
    };
    App.prototype.loadProtobuf = function () {
        if (this.protobufContent && this.protobufTypePath) {
            try {
                this.protobufType = protobuf.parse(this.protobufContent).root.lookup(this.protobufTypePath);
                this.messages.unshift({
                    moment: getNow(),
                    type: 'tips',
                    tips: 'The protobuf definitions is loaded successfully.',
                    id: this.id++
                });
            }
            catch (error) {
                this.messages.unshift({
                    moment: getNow(),
                    type: 'error',
                    reason: error.message,
                    id: this.id++
                });
            }
        }
    };
    App.prototype.savingAsBookmark = function () {
        var _this = this;
        this.isEditing = !this.isEditing;
        Vue.nextTick(function () {
            var bookmarkNameElement = _this.$refs.bookmarkName;
            if (bookmarkNameElement) {
                bookmarkNameElement.focus();
            }
        });
    };
    App.prototype.toggleFilter = function () {
        var _this = this;
        this.filterIsHidden = !this.filterIsHidden;
        Vue.nextTick(function () {
            var filterElement = _this.$refs.filter;
            if (filterElement) {
                filterElement.focus();
            }
        });
    };
    App.prototype.toggleSocketIO = function () {
        this.socketIOIsHidden = !this.socketIOIsHidden;
    };
    App.prototype.toggleStomp = function () {
        this.stompIsHidden = !this.stompIsHidden;
    };
    App.prototype.toggleBayeux = function () {
        this.bayeuxIsHidden = !this.bayeuxIsHidden;
    };
    App.prototype.toggleProtobuf = function () {
        this.protobufIsHidden = !this.protobufIsHidden;
    };
    App.prototype.toggleDNS = function () {
        this.dnsIsHidden = !this.dnsIsHidden;
    };
    App.prototype.saveAsBookmark = function () {
        this.isEditing = false;
        this.bookmarks.unshift({
            name: this.bookmarkName,
            isSocketIO: this.isSocketIO,
            ignorePing: this.ignorePing,
            baseUrl: this.baseUrl,
            parameters: this.parameters,
            anchor: this.anchor,
            message: this.message,
            showRaw: this.showRaw,
            showFormatted: this.showFormatted,
            subprotocol: this.subprotocol,
            protobufContent: this.protobufContent,
            protobufTypePath: this.protobufTypePath,
            messageType: this.messageType,
            protocol: this.protocol,
            host: this.host,
            port: this.port,
            httpMethod: this.httpMethod,
            headers: this.headers,
            dnsTransactionId: this.dnsTransactionId,
            dnsQuestionName: this.dnsQuestionName
        });
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
    };
    App.prototype.deleteBookmark = function (index) {
        this.bookmarks.splice(index, 1);
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
    };
    App.prototype.useBookmark = function (index) {
        var bookmark = this.bookmarks[index];
        this.isSocketIO = bookmark.isSocketIO;
        this.ignorePing = bookmark.ignorePing;
        this.showRaw = bookmark.showRaw;
        this.showFormatted = bookmark.showFormatted;
        this.message = bookmark.message;
        this.baseUrl = bookmark.baseUrl;
        var newParameters = JSON.stringify(bookmark.parameters);
        this.parameters = JSON.parse(newParameters);
        this.anchor = bookmark.anchor;
        localStorage.setItem('baseUrl', bookmark.baseUrl);
        localStorage.setItem('parameters', newParameters);
        localStorage.setItem('anchor', bookmark.anchor);
        this.subprotocol = bookmark.subprotocol;
        this.protobufContent = bookmark.protobufContent;
        this.protobufTypePath = bookmark.protobufTypePath;
        this.messageType = bookmark.messageType;
        this.protocol = bookmark.protocol;
        this.host = bookmark.host;
        this.port = bookmark.port;
        this.httpMethod = bookmark.httpMethod;
        this.headers = bookmark.headers;
        localStorage.setItem('headers', JSON.stringify(bookmark.headers));
    };
    App.prototype.setKeyOfParameter = function (index, e) {
        this.parameters[index].key = e.target.value;
        localStorage.setItem('parameters', JSON.stringify(this.parameters));
    };
    App.prototype.setKeyOfHeader = function (index, e) {
        this.headers[index].key = e.target.value;
        localStorage.setItem('headers', JSON.stringify(this.headers));
    };
    App.prototype.setKeyOfFormData = function (index, e) {
        this.formDatas[index].key = e.target.value;
    };
    App.prototype.setValueOfParameter = function (index, e) {
        this.parameters[index].value = e.target.value;
        localStorage.setItem('parameters', JSON.stringify(this.parameters));
    };
    App.prototype.setValueOfHeader = function (index, e) {
        this.headers[index].value = e.target.value;
        localStorage.setItem('headers', JSON.stringify(this.headers));
    };
    App.prototype.setValueOfFormData = function (index, e) {
        var element = e.target;
        this.formDatas[index].value = element.files && element.files.length > 0 ? element.files[0] : element.value;
    };
    App.prototype.setTypeOfFormData = function (index, e) {
        this.formDatas[index].type = e.target.value;
    };
    App.prototype.deleteParameter = function (index) {
        this.parameters.splice(index, 1);
        localStorage.setItem('parameters', JSON.stringify(this.parameters));
    };
    App.prototype.deleteHeader = function (index) {
        this.headers.splice(index, 1);
        localStorage.setItem('headers', JSON.stringify(this.headers));
    };
    App.prototype.deleteFormData = function (index) {
        this.formDatas.splice(index, 1);
    };
    App.prototype.addParameter = function () {
        this.parameters.push({
            key: '',
            value: ''
        });
    };
    App.prototype.addHeader = function () {
        this.headers.push({
            key: '',
            value: ''
        });
    };
    App.prototype.addFormData = function () {
        this.formDatas.push({
            key: '',
            value: '',
            type: 'text'
        });
    };
    App.prototype.connect = function () {
        if (this.protocol === 'WebSocket') {
            try {
                this.websocket = this.subprotocol ? new WebSocket(this.url, this.subprotocol) : new WebSocket(this.url);
            }
            catch (error) {
                this.messages.unshift({
                    moment: getNow(),
                    type: 'error',
                    reason: error.message,
                    id: this.id++
                });
                return;
            }
            this.websocket.binaryType = 'arraybuffer';
            this.websocket.onopen = this.onopen;
            this.websocket.onclose = this.onclose;
            this.websocket.onmessage = this.onmessage;
            this.websocket.onerror = this.onerror;
            if (this.isSocketIO) {
                pingId = setInterval(this.ping, 25000);
            }
        }
        else if (this.protocol === 'TCP') {
            // zll
            this.errorStatus = 502;
            this.isClosed = false;
            this.hasError();
            this.serialNumber = new Date().getTime();
            if (proxyWebSocket && !isNaN(+this.port)) {
                var protocol = {
                    kind: "tcp:connect" /* tcpConnect */,
                    host: this.host,
                    port: +this.port
                };
                proxyWebSocket.send(JSON.stringify(protocol));
            }
        }
    };
    App.prototype.sendMessage = function () {
        this.send(this.message);
    };
    App.prototype.useStompConnectionMessage = function () {
        this.message = stompConnectionMessage;
    };
    App.prototype.useStompSubscriptionMessage = function () {
        this.message = stompSubscriptionMessage;
    };
    App.prototype.useStompSendMessage = function () {
        this.message = stompSendMessage;
    };
    App.prototype.useSocketIOSendMessage = function () {
        this.message = socketIOSendMessage;
    };
    App.prototype.useBayeuxHandshakeMessage = function () {
        this.message = bayeuxHandshakeMessage;
    };
    App.prototype.useBayeuxSubscribeMessage = function () {
        this.message = bayeuxSubscribeMessage;
    };
    App.prototype.useBayeuxPublishMessage = function () {
        this.message = bayeuxPublishMessage;
    };
    App.prototype.useBayeuxPingMessage = function () {
        this.message = bayeuxPingMessage;
    };
    App.prototype.clear = function () {
        this.messages = [];
    };
    App.prototype.previewMessage = function () {
        this.isPreview = true;
        if (this.protocol === 'WebSocket' && this.isSocketIO) {
            this.previewResult = '';
            previewDecoder.add(this.message);
        }
        else if (this.messageType === 'Uint8Array') {
            try {
                this.previewResult = new TextDecoder('utf-8').decode(new Uint8Array(this.message.split(',').map(function (m) { return +m; })));
            }
            catch (error) {
                this.previewResult = error;
            }
        }
        else {
            try {
                this.previewResult = JSON.stringify(JSON.parse(this.message), null, '    ');
            }
            catch (error) {
                this.previewResult = error;
            }
        }
    };
    App.prototype.cancelPreview = function () {
        this.isPreview = false;
    };
    App.prototype.showTips = function () {
        this.messages.unshift({
            moment: getNow(),
            type: 'tips',
            tips: 'Tips: \n' +
                "1. for socket.io, if you connect 'http://localhost', in ws's perspective, you connected 'ws://localhost/socket.io/?transport=websocket'\n" +
                "2. for socket.io, if you connect 'https://localhost', in ws's perspective, you connected 'wss://localhost/socket.io/?transport=websocket'\n" +
                "3. chrome's developer tool is a good tool to view ws connection and messages\n" +
                "4. for ActiveMQ, the default url is 'ws://localhost:61614' ,the subprotocol should be 'stomp'\n" +
                '5. for HTTP, set `Content-Type` be `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain` to avoid CORS preflight',
            id: this.id++
        });
    };
    App.prototype.close = function () {
        this.messages.unshift({
            moment: getNow(),
            type: 'tips',
            tips: 'Is going to disconnect manually.',
            id: this.id++
        });
        if (this.protocol === 'WebSocket') {
            this.websocket.close();
        }
        else if (this.protocol === 'TCP') {
            var protocol = {
                kind: "tcp:disconnect" /* tcpDisconnect */
            };
            proxyWebSocket.send(JSON.stringify(protocol));
        }
        clearTimeout(this.timer);
        this.isClosed = true;
        this.errorStatus = 503;
    };
    App.prototype.onmessage = function (e) {
        this.onmessageAccepted(e.data, e.type);
    };
    App.prototype.toggleMessageVisibility = function (message) {
        message.visible = !this.messageVisibility(message);
    };
    App.prototype.resultId = function (index) {
        return "result-" + index;
    };
    App.prototype.messageVisibility = function (message) {
        return message.visible !== undefined
            ? message.visible
            : (message.formattedData ? this.showFormatted : this.showRaw);
    };
    App.prototype.visibilityButtonStyle = function (message) {
        return {
            position: 'absolute',
            bottom: (this.messageVisibility(message) ? (10 + message.visibilityButtonExtraBottom) : 0) + 'px',
            right: 10 + 'px'
        };
    };
    App.prototype.showError = function (error) {
        this.messages.unshift({
            moment: getNow(),
            type: 'error',
            reason: error.message,
            id: this.id++
        });
    };
    // tslint:disable-next-line:cognitive-complexity
    App.prototype.send = function (message) {
        var _this = this;
        var e_4, _a, e_5, _b;
        var data;
        var isBinary = true;
        if (this.messageType === 'Uint8Array') {
            //let test1 : number[] = [0x1];
            //test1 = this.message.split(' ').map(m => +m);
            //data = new Uint8Array(test1);
            //data = new Uint8Array(this.message.split('').map(m => +m))
            var str = this.message;
            var strs = str.split(' ');
            var out = new ArrayBuffer(strs.length);
            var u16a = new Uint8Array(out);
            for (var i = 0, j = 0; i < strs.length; i++) {
                u16a[j] = parseInt(strs[i], 16);
                j++;
            }
            data = u16a;
        }
        else if (this.messageType === 'protobuf') {
            if (this.protobufType) {
                try {
                    data = this.protobufType.encode(JSON.parse(this.message)).finish();
                }
                catch (error) {
                    this.messages.unshift({
                        moment: getNow(),
                        type: 'error',
                        reason: error.message,
                        id: this.id++
                    });
                    return;
                }
            }
            else {
                this.messages.unshift({
                    moment: getNow(),
                    type: 'error',
                    reason: 'Protobuf file content is not loaded.',
                    id: this.id++
                });
                return;
            }
        }
        else {
            data = (this.message);
            //data = strToHexCharCode(this.message)
            //data = this.message
            isBinary = false;
        }
        var rawData;
        var formattedData;
        if (this.protocol === 'WebSocket') {
            if (this.websocket && data) {
                if (!(this.ignorePing && message === '2')) {
                    rawData = message;
                    formattedData = data.toString();
                }
                this.websocket.send(data);
            }
        }
        else if (this.protocol === 'TCP') {
            if (proxyWebSocket && data) {
                /*
                        let str : string = ''
                        if (typeof data === 'string') {
                          str = data;
                        } else {
                          //let num : number = 0x01;
                          for(var i =0; i<data.length;i++){
                            //num = data[i];
                            str += data[i].toString(16) + ' '
                          }
                        }
                */
                var protocol = {
                    kind: "tcp:send" /* tcpSend */,
                    isBinary: isBinary,
                    //message: str
                    message: typeof data === 'string' ? data : data.toString()
                };
                formattedData = JSON.stringify(protocol, null, '  ');
                proxyWebSocket.send(JSON.stringify(protocol));
            }
        }
        else if (this.protocol === 'UDP') {
            if (proxyWebSocket) {
                if (!this.dnsIsHidden) {
                    var request = new DNSMessage(this.dnsTransactionId);
                    request.addQuestion(this.dnsQuestionName);
                    formattedData = JSON.stringify(request, null, '  ');
                    data = request.encode();
                    isBinary = true;
                }
                if (data) {
                    var protocol = {
                        kind: "udp:send" /* udpSend */,
                        address: this.host,
                        port: +this.port,
                        isBinary: isBinary,
                        message: typeof data === 'string' ? data : data.toString()
                    };
                    if (!formattedData) {
                        formattedData = JSON.stringify(protocol, null, '  ');
                    }
                    proxyWebSocket.send(JSON.stringify(protocol));
                }
            }
        }
        else if (this.protocol === 'HTTP') {
            var request_1 = new XMLHttpRequest();
            request_1.onloadend = function (e) {
                _this.onmessageAccepted(request_1.status + " " + request_1.statusText + "\n" + request_1.getAllResponseHeaders(), '');
                _this.onmessageAccepted(request_1.response, '');
            };
            request_1.upload.onprogress = function (e) {
                var percent = Math.round(e.loaded * 100 / e.total);
                _this.onmessageAccepted(e.loaded + " / " + e.total + " (" + percent + "%)", '');
            };
            if (this.useProxy) {
                request_1.open(this.httpMethod, '/proxy');
                request_1.setRequestHeader(toUrlHeaderName, this.url);
                request_1.setRequestHeader(headersName, JSON.stringify(this.headers.filter(function (h) { return h.key; })));
            }
            else {
                request_1.open(this.httpMethod, this.url);
                try {
                    for (var _c = tslib_1.__values(this.headers), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var header = _d.value;
                        request_1.setRequestHeader(header.key, header.value);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
            if (this.shouldContainBody) {
                if (this.messageType === 'FormData') {
                    var formData = new FormData();
                    try {
                        for (var _e = tslib_1.__values(this.formDatas), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var _g = _f.value, key = _g.key, value = _g.value;
                            if (key) {
                                formData.append(key, value);
                            }
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    request_1.send(formData);
                }
                else {
                    request_1.send(this.message);
                }
            }
            else {
                request_1.send();
            }
        }
        else if (this.protocol === 'WebRTC') {
            if (this.dataChannel) {
                rawData = message;
                this.dataChannel.send(message);
            }
        }
        if (rawData) {
            this.messages.unshift({
                moment: getNow(),
                type: 'out',
                rawData: rawData,
                visible: undefined,
                visibilityButtonExtraBottom: 0,
                isBinary: isBinary,
                id: this.id++
            });
        }
        if (formattedData) {
            this.messages.unshift({
                moment: getNow(),
                type: 'out',
                formattedData: formattedData,
                visible: undefined,
                visibilityButtonExtraBottom: 0,
                isBinary: isBinary,
                id: this.id++
            });
        }
    };
    App.prototype.ping = function () {
        this.send('2');
    };
    App.prototype.onopen = function (e) {
        this.messages.unshift({
            moment: getNow(),
            type: e.type,
            id: this.id++
        });
    };
    App.prototype.onclose = function (e) {
        this.messages.unshift({
            moment: getNow(),
            type: e.type,
            reason: e.reason,
            id: this.id++
        });
        this.websocket = null;
        clearInterval(pingId);
    };
    // tslint:disable-next-line:cognitive-complexity
    App.prototype.onmessageAccepted = function (eventData, eventType) {
        if (this.ignorePing && eventData === '3') {
            return;
        }
        var isBinary = typeof eventData !== 'string';
        if (eventData === '3') {
            this.messages.unshift({
                moment: getNow(),
                type: eventType,
                data: eventData,
                isBinary: isBinary,
                id: this.id++
            });
            return;
        }
        var type = 'in';
        var typedArray;
        var rawData;
        var status;
        if (isBinary) {
            typedArray = new Uint8Array(eventData);
            var num = void 0;
            var strtypedArray = ' ';
            for (var i = 0; i < typedArray.length; i++) {
                num = typedArray[i];
                strtypedArray += PrefixInteger(num.toString(16), 2) + ' ';
            }
            rawData = strtypedArray;
            status = 'in';
        }
        else {
            typedArray = undefined;
            rawData = eventData;
            if (rawData.includes('disconnected')) {
                status = 'disconnect';
            }
            else {
                status = 'connect';
            }
        }
        this.messages.unshift({
            moment: getNow(),
            type: status,
            rawData: rawData,
            visible: undefined,
            visibilityButtonExtraBottom: 0,
            isBinary: isBinary,
            id: this.id++
        });
        if (this.protocol === 'WebSocket' && this.isSocketIOInternally) {
            decoder.add(eventData);
        }
        else if (!isBinary) {
            try {
                var protocol = JSON.parse(eventData);
                if (this.protocol !== 'WebSocket') {
                    if (protocol.kind === "tcp:connected" /* tcpConnected */) {
                        this.tcpConnected = true;
                    }
                    else if (protocol.kind === "tcp:disconnected" /* tcpDisconnected */) {
                        this.tcpConnected = false;
                    }
                }
                if (this.tcpConnected) {
                    this.messages.unshift({
                        moment: getNow(),
                        type: 'connect',
                        formattedData: JSON.stringify(protocol, null, '    '),
                        isBinary: isBinary,
                        visible: undefined,
                        visibilityButtonExtraBottom: 0,
                        id: this.id++
                    });
                }
                else {
                    this.messages.unshift({
                        moment: getNow(),
                        type: 'disconnect',
                        formattedData: JSON.stringify(protocol, null, '    '),
                        isBinary: isBinary,
                        visible: undefined,
                        visibilityButtonExtraBottom: 0,
                        id: this.id++
                    });
                }
            }
            catch (error) {
                printInConsole(error);
            }
        }
        else {
            try {
                var formattedData = new TextDecoder('utf-8').decode(typedArray);
                this.messages.unshift({
                    moment: getNow(),
                    type: 'in',
                    formattedData: formattedData,
                    isBinary: isBinary,
                    visible: undefined,
                    visibilityButtonExtraBottom: 0,
                    id: this.id++
                });
            }
            catch (error) {
                printInConsole(error);
            }
            if (this.protobufType) {
                try {
                    var object = this.protobufType.toObject(this.protobufType.decode(typedArray));
                    this.messages.unshift({
                        moment: getNow(),
                        type: type,
                        formattedData: JSON.stringify(object, null, '    '),
                        isBinary: isBinary,
                        visible: undefined,
                        visibilityButtonExtraBottom: 0,
                        id: this.id++
                    });
                }
                catch (error) {
                    printInConsole(error);
                }
            }
            else if (!this.dnsIsHidden && typedArray) {
                try {
                    var object = DNSMessage.parse(typedArray.buffer);
                    this.messages.unshift({
                        moment: getNow(),
                        type: type,
                        formattedData: JSON.stringify(object, null, '    '),
                        isBinary: isBinary,
                        visible: undefined,
                        visibilityButtonExtraBottom: 0,
                        id: this.id++
                    });
                }
                catch (error) {
                    printInConsole(error);
                }
            }
        }
    };
    App.prototype.onerror = function (e) {
        this.messages.unshift({
            moment: getNow(),
            type: e.type,
            id: this.id++
        });
        this.websocket = null;
        clearInterval(pingId);
    };
    App.prototype.showLocalDescription = function () {
        this.messages.unshift({
            moment: getNow(),
            type: 'tips',
            tips: JSON.stringify(this.peerConnection.localDescription.toJSON()),
            id: this.id++
        });
    };
    App = tslib_1.__decorate([
        Component({
            render: appTemplateHtml,
            staticRenderFns: appTemplateHtmlStatic
        }),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], App);
    return App;
}(Vue));
export { App };
var app = new App({
    el: '#body'
});
// zll 自动连接
// setTimeout(()=>{
// 	app.connect()
// }, 100)
if (!WebSocket) {
    app.messages.unshift({
        moment: getNow(),
        type: 'tips',
        tips: "current browser doesn't support WebSocket",
        id: app.id++
    });
}
decoder.on('decoded', function (decodedPacket) {
    app.messages.unshift({
        moment: getNow(),
        type: 'in',
        formattedData: JSON.stringify(decodedPacket, null, '    '),
        visible: undefined,
        visibilityButtonExtraBottom: 0,
        id: app.id++
    });
});
previewDecoder.on('decoded', function (decodedPacket) {
    app.previewResult = JSON.stringify(decodedPacket, null, '    ');
});
window.onscroll = function () {
    var innerHeight = (window.innerHeight || document.documentElement.clientHeight);
    for (var i = 0; i < app.messages.length; i++) {
        var message = app.messages[i];
        var element = document.getElementById(app.resultId(i));
        if (element) {
            var rect = element.getBoundingClientRect();
            message.visibilityButtonExtraBottom = (rect.top < innerHeight - 40 && rect.top + rect.height > innerHeight)
                ? (rect.top + rect.height - innerHeight) : 0;
        }
    }
};
var wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
proxyWebSocket = new WebSocket(wsProtocol + "//" + location.host);
proxyWebSocket.binaryType = 'arraybuffer';
proxyWebSocket.onmessage = function (event) {
    app.onmessage(event);
};
proxyWebSocket.onerror = function (event) {
    printInConsole(event);
    app.useProxy = false;
};
if (navigator.serviceWorker && !location.host.startsWith('localhost')) {
    navigator.serviceWorker.register('service-worker.bundle.js').catch(function (error) {
        printInConsole('registration failed with error: ' + error);
    });
}
function printInConsole(message) {
    console.log(message);
}
