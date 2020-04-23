import Vue, { ComponentOptions } from 'vue'
import Component from 'vue-class-component'
import { Decoder } from 'socket.io-parser'
import Clipboard from 'clipboard'
import * as protobuf from 'protobufjs'
import DNSMessage from 'dns-protocol/browser'
import * as types from './types'
import { appTemplateHtml, appTemplateHtmlStatic } from './variables'

// tslint:disable-next-line:no-unused-expression
new Clipboard('.clipboard')
let pingId: NodeJS.Timer
const decoder = new Decoder()
const previewDecoder = new Decoder()
const parameters = localStorage.getItem('parameters')
const headers = localStorage.getItem('headers')
const bookmarks = localStorage.getItem('bookmarks')
let proxyWebSocket: WebSocket
const toUrlHeaderName = 'x-to-url'
const headersName = 'x-headers'

function formatTimeNumber(num: number) {
  return num < 10 ? '0' + num : num.toString()
}

function getNow() {
  var date = new Date()
  return `${formatTimeNumber(date.getFullYear())}-${formatTimeNumber(date.getMonth()+1)}-${formatTimeNumber(date.getDate())} ${formatTimeNumber(date.getHours())}:${formatTimeNumber(date.getMinutes())}:${formatTimeNumber(date.getSeconds())}`
}

function PrefixInteger(num: string, length:number) { return (Array(length).join('0') + num).slice(-length)}


function getQueryString(name: string) {
	var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
	var r = window.location.search.substr(1).match(reg);
	// if (r != null)  return r[2];
	if (r != null)  return decodeURIComponent(r[2]);
	return null;
}
	
type Parameter = {
  key: string;
  value: string;
}

type FormData = {
  key: string;
  value: string | File;
  type: 'text' | 'file';
}

type Bookmark = {
  name: string;
  isSocketIO: boolean;
  ignorePing: boolean;
  baseUrl: string;
  parameters: Parameter[];
  anchor: string;
  message: string;
  showRaw: boolean;
  showFormatted: boolean;
  subprotocol: string;
  protobufContent: string;
  protobufTypePath: string;
  messageType: string;
  protocol: string;
  host: string;
  port: number;
  httpMethod: string;
  headers: types.Header[];
  dnsQuestionName: string;
  dnsTransactionId: number;
}

type Message = {
  msgStatus?: string; //zll 信息的状态
  status?: number; //zll 信息的状态
  mainPack?: string; //zll 
  subPack?: string; //zll 
  moment: string;
  type: string;
  reason?: string;
  data?: string;
  tips?: string;
  rawData?: string;
  formattedData?: string;
  visible?: boolean;
  visibilityButtonExtraBottom?: number;
  isBinary?: boolean;
  id: number;
}

const stompConnectionMessage = `CONNECT
login:admin
passcode:admin
accept-version:1.2,1.1,1.0
heart-beat:0,0

\0`

const stompSubscriptionMessage = `SUBSCRIBE
id:sub-0
destination:/topic/test_topic

\0`

const stompSendMessage = `SEND
destination:/queue/test
content-type:text/plain

hello queue test
\0`

const socketIOSendMessage = `42["a_event",{
    "a_key":"a_value"
}]`

const bayeuxHandshakeMessage = `[{
    "advice":{ "timeout":60000, "interval":0 },
    "channel":"/meta/handshake",
    "ext":{},
    "id":"1",
    "minimumVersion": "0.9",
    "supportedConnectionTypes": ["websocket"],
    "version": "1.0"
}]`

const bayeuxSubscribeMessage = `[{
    "channel": "/meta/subscribe",
    "clientId": "",
    "id": "2",
    "subscription": "/test_channel"
}]`

const bayeuxPublishMessage = `[{
    "channel": "/test_channel",
    "clientId": "",
    "data": {},
    "id": "3"
}]`

const bayeuxPingMessage = `[{
    "advice": { "timeout": 0 },
    "channel": "/meta/connect",
    "clientId": "",
    "connectionType": "websocket",
    "id": "4"
}]`

const defaultProtobufContent = `package testPackage;
syntax = "proto3";
message Test {
    required string data = 1;
}`

type DataChannelStatus = 'none' | 'init' | 'created offer' | 'answered offer' | 'set answer'

@Component({
  render: appTemplateHtml,
  staticRenderFns: appTemplateHtmlStatic
})
export class App extends Vue {
  serverUrl: string = "http://106.12.153.196:12345"
  messages: Message[] = []
  parameters: Parameter[] = parameters ? JSON.parse(parameters) : [{ key: 'transport', value: 'websocket' }, { key: 'room', value: 'test' }]
  previewResult: string = ''
  isPreview: boolean = false
  bookmarks: Bookmark[] = bookmarks ? JSON.parse(bookmarks) : []
  isEditing: boolean = false
  bookmarkName: string = ''
  filter = ''
  filterIsHidden: boolean = true
  stompIsHidden = true
  protobufIsHidden = true
  dnsIsHidden = true
  headers: types.Header[] = headers ? JSON.parse(headers) : [{ key: 'Content-Type', value: 'application/json' }]
  socketIOIsHidden: boolean = true
  formDatas: FormData[] = []
  peerConnection = window.RTCPeerConnection ? new RTCPeerConnection({}) : null
  dataChannelName = 'my_test_channel'
  sessionDescription = ''
  dataChannelStatus: DataChannelStatus = 'none'
  id = 1
  bayeuxIsHidden: boolean = true
  useProxy = true
  private protobufType: protobuf.Type | null = null
  private dataChannel: RTCDataChannel | null = null
  private websocket: WebSocket | null = null
  private isSocketIOInternally: boolean = !!localStorage.getItem('isSocketIO')
  private ignorePingInternally: boolean = !!localStorage.getItem('ignorePing')
  private baseUrl: string = localStorage.getItem('baseUrl') || 'wss://copy.yorkyao.xyz/socket.io/'
  private anchor: string = localStorage.getItem('anchor') || ''
  private messageInternally: string = localStorage.getItem('message') || ''
  // private showRawInternally: boolean = !!localStorage.getItem('showRaw')
  private showRawInternally: boolean = true
  private showFormattedInternally: boolean = !!localStorage.getItem('showFormatted')
  private subprotocolInternally = localStorage.getItem('subprotocol') || ''
  private protobufContentInternally = localStorage.getItem('protobufContent') || defaultProtobufContent
  private protobufTypePathInternally = localStorage.getItem('protobufTypePath') || 'testPackage.Test'
  private dnsTransactionIdInternally = +localStorage.getItem('dnsTransactionId')! || 43825
  private dnsQuestionNameInternally = localStorage.getItem('dnsQuestionName') || 'www.example.com'
  private messageTypeInternally = localStorage.getItem('messageType') || 'string'
  // private protocolInternally = localStorage.getItem('protocol') || 'WebSocket'
  private protocolInternally = localStorage.getItem('protocol') || 'TCP'
  // private hostInternally = localStorage.getItem('host') || 'localhost'
  // private portInternally = +localStorage.getItem('port')! || 9999
  private hostInternally = getQueryString('host') || 'localhost'//zll
  private portInternally = +getQueryString('port')! || 9999//zll
  private mainPackInternally = getQueryString('main') || ''//zll
  private subPackInternally = getQueryString('sub') || ''//zll
  private timer:any = null//zll
  private timerInterval:number = 20; //判断间隔 s
  // errorStatus = 200正常
  // errorStatus = 401主站通讯故障
  // errorStatus = 402主站报文错误
  // errorStatus = 403从站报文错误
  // errorStatus = 501未连接
  // errorStatus = 502已断开
  private errorStatus: number = 501//zll
  private isClosed: boolean = true//zll
  private errorObj: any = {
	  "200": "正常",
	  "401": "主站通讯故障",
	  "402": "主站报文错误",
	  "403": "从站报文错误",
	  "501": "未连接",
	  "502": "已连接",
	  "503": "已断开"
  }
  private errorMsgs:any = []  // 前台展示的错误列表
  private serialNumber:number = 0  // 为了只得到本次的错误信息
  private showPackDeatil:boolean = false  // 是否查看报文
  
  
  
  private tcpConnected = false
  private httpMethodInternally = localStorage.getItem('httpMethod') || 'GET'
  private isDataChannelConnected = false

  constructor(options?: ComponentOptions<Vue>) {
    super(options)
    if (this.peerConnection) {
      this.peerConnection.ondatachannel = event => {
        event.channel.onopen = e => {
          app.isDataChannelConnected = true
          this.messages.unshift({
            moment: getNow(),
            type: 'tips',
            tips: 'peer connection opened.',
            id: app.id++
          })
        }
        event.channel.onclose = e => {
          app.isDataChannelConnected = false
          this.messages.unshift({
            moment: getNow(),
            type: 'tips',
            tips: 'peer connection closed.',
            id: app.id++
          })
        }
        event.channel.onmessage = e => {
          this.onmessage(e)
        }
      }
    }
  }

  get httpMethod() {
    return this.httpMethodInternally
  }
  set httpMethod(value: string) {
    localStorage.setItem('httpMethod', value)
    this.httpMethodInternally = value
  }
  get host() {
    return this.hostInternally
  }
  set host(value: string) {
    localStorage.setItem('host', value)
    this.hostInternally = value
  }
  get port() {
    return this.portInternally
  }
  set port(value: number) {
    localStorage.setItem('port', String(value))
    this.portInternally = value
  }
  get mainPack() {
    return this.mainPackInternally
  }
  get subPack() {
    return this.subPackInternally
  }
  get protocol() {
    return this.protocolInternally
  }
  set protocol(value: string) {
    if (value === 'HTTP' || this.messageType === 'FormData') {
      this.messageType = 'string'
    }
    localStorage.setItem('protocol', value)
    this.protocolInternally = value
  }
  get messageType() {
    return this.messageTypeInternally
  }
  set messageType(value: string) {
    localStorage.setItem('messageType', value)
    this.messageTypeInternally = value
  }
  get protobufContent() {
    return this.protobufContentInternally
  }
  set protobufContent(value: string) {
    localStorage.setItem('protobufContent', value)
    this.protobufContentInternally = value
  }
  get protobufTypePath() {
    return this.protobufTypePathInternally
  }
  set protobufTypePath(value: string) {
    localStorage.setItem('protobufTypePath', value)
    this.protobufTypePathInternally = value
  }
  get dnsTransactionId() {
    return this.dnsTransactionIdInternally
  }
  set dnsTransactionId(value: number) {
    localStorage.setItem('dnsTransactionId', value.toString())
    this.dnsTransactionIdInternally = value
  }
  get dnsQuestionName() {
    return this.dnsQuestionNameInternally
  }
  set dnsQuestionName(value: string) {
    localStorage.setItem('dnsQuestionName', value.toString())
    this.dnsQuestionNameInternally = value
  }
  // tslint:disable-next-line:cognitive-complexity
  get filteredMessages() {
	  
	// const that = this
	// console.log(this.messages);
	// var firstInMsg = true
    return this.messages.filter(m => {
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
		
		
      if (this.filter) {
        return (typeof m.rawData === 'string' && m.rawData.indexOf(this.filter) !== -1)
          || (typeof m.moment === 'string' && m.moment.indexOf(this.filter) !== -1)
          || (typeof m.formattedData === 'string' && m.formattedData.indexOf(this.filter) !== -1)
          || (typeof m.type === 'string' && m.type.indexOf(this.filter) !== -1)
          || (typeof m.reason === 'string' && m.reason.indexOf(this.filter) !== -1)
          || (typeof m.data === 'string' && m.data.indexOf(this.filter) !== -1)
          || (typeof m.tips === 'string' && m.tips.indexOf(this.filter) !== -1)
      } else {
        return true
      }
    }).slice(0, 100)
  }
  
  saveErrorMsg(msg: any) {//zll
  
	  console.log('msg==', msg);
  	  const config = {
  	  	type: 'post',
  	  	url: this.serverUrl + '/saveErrorMsg',
		data :JSON.stringify(msg),
		params:''//url传递的参数
  	  }
	  
	  var that: any = this
	  this.ajax(config, function(res:any){
			 that.getErrorMsg()
	  		 console.log(res);
	  		 console.log('错误信息保存成功')
	  })
  }
  
  getErrorMsg() {//zll
	  var that: any = this
  	  const config = {
  	  	type: 'get',
  	  	url: this.serverUrl + '/getErrorMsg',
		data: null,
		params: "currentPage=1&pageSize=10&serialNumber="+this.serialNumber//url传递的参数
  	  	// dataType: "application/x-www-form-urlencoded"
  	  }
  	  // var that = this
	  this.ajax(config, function(res:any){
		  that.errorMsgs = JSON.parse(res).data
	  })

  }
  private ajax(config:any, callback:any){
	  var xhr = new XMLHttpRequest();
	  xhr.onreadystatechange = function (){
	  	if(xhr.readyState == 4 && xhr.status == 200){
	  		callback && callback(xhr.responseText)
	  	}
	  }
	    	 
	  xhr.open(config.type, config.url+"?"+config.params, true);
	  // 如果想要使用post提交数据,必须添加此行
	  xhr.setRequestHeader("Content-type", "application/json");
	  xhr.send(config.data);
  }
   hasError(){ //zll
	   
	   this.timer = setTimeout(()=>{ 
		   console.log('hasError', new Date());
		   console.log(this.isClosed);
		   if(this.isClosed) {
			   return
		   }
		   this.errorStatus = 200 //默认正常
		   var msgstr:string = ''
		    for(var i:number=0, len:number=this.messages.length; i<len; i++) {
				 var m:Message = this.messages[i]
		   	  if(m.type ==='in' && typeof m.rawData === 'string') {
		   		  if(new Date().getTime() - new Date(m.moment).getTime() > this.timerInterval*1000) break
		   		  msgstr += m.rawData
		   	  }
		     }
		     console.log(msgstr);
		     if(!msgstr) {
		   	  this.errorStatus = 401 //主站通讯故障
		   	  return
		     }
		     
		   if(!msgstr.match(this.mainPackInternally)) this.errorStatus = 402 //主站报文错误
		   var wholePack:string = this.mainPackInternally + " " + this.subPackInternally
		   if(msgstr.match(this.mainPackInternally) && !msgstr.match(wholePack)) this.errorStatus = 403 //从站报文错误
		   
		   
		   if(this.errorStatus===401 || this.errorStatus===402||this.errorStatus===403) {
			   this.saveErrorMsg({
				  mainPack: this.mainPackInternally,
				  subPack: this.subPackInternally,
				  moment: getNow(),
				  msgStatus: this.errorObj[this.errorStatus],
				  serialNumber: this.serialNumber
			   })
			   
		   }
			   
		   
		   this.hasError()
	   }, this.timerInterval*1000)
	 
	  
  }
  
  get subprotocol() {
    return this.subprotocolInternally
  }
  set subprotocol(value) {
    localStorage.setItem('subprotocol', value)
    this.subprotocolInternally = value
  }
  get canSaveAsBookmark() {
    if (this.bookmarkName.trim() === '') {
      return false
    }
    for (const bookmark of this.bookmarks) {
      if (bookmark.name === this.bookmarkName) {
        return false
      }
    }
    return true
  }
  get isSocketIO() {
    return this.isSocketIOInternally
  }
  set isSocketIO(value) {
    localStorage.setItem('isSocketIO', value ? '1' : '')
    this.isSocketIOInternally = value
  }
  get ignorePing() {
    return this.ignorePingInternally
  }
  set ignorePing(value) {
    localStorage.setItem('ignorePing', value ? '1' : '')
    this.ignorePingInternally = value
  }
  get showRaw() {
    return this.showRawInternally
  }
  set showRaw(value) {
    localStorage.setItem('showRaw', value ? '1' : '')
    this.showRawInternally = value
  }
  get showFormatted() {
    return this.showFormattedInternally
  }
  set showFormatted(value) {
    localStorage.setItem('showFormatted', value ? '1' : '')
    this.showFormattedInternally = value
  }
  get message() {
    return this.messageInternally
  }
  set message(value) {
    localStorage.setItem('message', value)
    this.messageInternally = value
  }
  get url() {
    let url = this.baseUrl
    if (this.parameters.length > 0) {
      url += '?'
      for (const parameter of this.parameters) {
        url += parameter.key + '=' + parameter.value + '&'
      }
      url = url.substring(0, url.length - 1)
    }
    if (this.anchor) {
      url += '#' + this.anchor
    }
    return url
  }
  set url(value) {
    let index = value.indexOf('#')
    if (index > -1) {
      value = value.substring(0, index)
      this.anchor = value.substring(index + 1)
    } else {
      this.anchor = ''
    }

    index = value.indexOf('?')
    if (index > -1) {
      this.baseUrl = value.substring(0, index)
      const array = value.substring(index + 1).split('&')
      const newParameters: Parameter[] = []
      for (const tmp of array) {
        index = tmp.indexOf('=')
        if (index === -1) {
          newParameters.push({
            key: tmp,
            value: ''
          })
        } else {
          newParameters.push({
            key: tmp.substring(0, index),
            value: tmp.substring(index + 1)
          })
        }
      }
      this.parameters = newParameters
    } else {
      this.baseUrl = value
      this.parameters = []
    }

    localStorage.setItem('baseUrl', this.baseUrl)
    localStorage.setItem('parameters', JSON.stringify(this.parameters))
    localStorage.setItem('anchor', this.anchor)
  }
  get isConnected() {
    return (this.protocol === 'WebSocket' && this.websocket)
      || (this.protocol === 'TCP' && this.tcpConnected)
      || (this.protocol === 'WebRTC' && this.dataChannel && this.isDataChannelConnected)
  }
  get isDisconnected() {
    return (this.protocol === 'WebSocket' && !this.websocket)
      || (this.protocol === 'TCP' && !this.tcpConnected)
      || (this.protocol === 'WebRTC' && !(this.dataChannel && this.isDataChannelConnected))
  }
  get shouldContainBody() {
    return this.httpMethod === 'POST'
      || this.httpMethod === 'PUT'
      || this.httpMethod === 'PATCH'
      || this.httpMethod === 'DELETE'
      || this.httpMethod === 'LINK'
      || this.httpMethod === 'UNLINK'
  }
  get shouldShowMessageTextarea() {
    return (this.messageType === 'string' || this.protocol !== 'HTTP') && this.dnsIsHidden
  }
  createDataChannel() {
    if (!this.peerConnection) {
      return
    }
    this.dataChannel = this.peerConnection.createDataChannel(this.dataChannelName)
    this.dataChannelStatus = 'init'
    this.messages.unshift({
      moment: getNow(),
      type: 'tips',
      tips: `create data channel successfully: ${this.dataChannelName}`,
      id: this.id++
    })
  }
  createOffer() {
    if (!this.peerConnection) {
      return
    }
    this.peerConnection.createOffer()
      .then(offer => this.peerConnection!.setLocalDescription(offer))
      .then(() => {
        this.showLocalDescription()
        this.dataChannelStatus = 'created offer'
      }, (error: Error) => {
        this.showError(error)
      })
  }
  answerOffer() {
    if (!this.peerConnection) {
      return
    }
    try {
      const offer = new RTCSessionDescription(JSON.parse(this.sessionDescription))
      this.peerConnection.setRemoteDescription(offer as any)
        .then(() => this.peerConnection!.createAnswer())
        .then(answer => this.peerConnection!.setLocalDescription(answer as any))
        .then(() => {
          this.showLocalDescription()
          this.dataChannelStatus = 'answered offer'
        }, (error: Error) => {
          this.showError(error)
        })
    } catch (error) {
      this.showError(error)
    }
  }
  setAnswer() {
    if (!this.peerConnection) {
      return
    }
    try {
      const answer = new RTCSessionDescription(JSON.parse(this.sessionDescription))
      this.peerConnection.setRemoteDescription(answer as any)
        .then(() => {
          this.messages.unshift({
            moment: getNow(),
            type: 'tips',
            tips: 'set answer successfully.',
            id: this.id++
          })
          this.dataChannelStatus = 'set answer'
        }, (error: Error) => {
          this.showError(error)
        })
    } catch (error) {
      this.messages.unshift({
        moment: getNow(),
        type: 'error',
        reason: error.message,
        id: this.id++
      })
    }
  }
  loadProtobuf() {
    if (this.protobufContent && this.protobufTypePath) {
      try {
        this.protobufType = protobuf.parse(this.protobufContent).root.lookup(this.protobufTypePath) as protobuf.Type
        this.messages.unshift({
          moment: getNow(),
          type: 'tips',
          tips: 'The protobuf definitions is loaded successfully.',
          id: this.id++
        })
      } catch (error) {
        this.messages.unshift({
          moment: getNow(),
          type: 'error',
          reason: error.message,
          id: this.id++
        })
      }
    }
  }
  savingAsBookmark() {
    this.isEditing = !this.isEditing
    Vue.nextTick(() => {
      const bookmarkNameElement = this.$refs.bookmarkName as HTMLElement
      if (bookmarkNameElement) {
        bookmarkNameElement.focus()
      }
    })
  }
  toggleFilter() {
    this.filterIsHidden = !this.filterIsHidden
    Vue.nextTick(() => {
      const filterElement = this.$refs.filter as HTMLElement
      if (filterElement) {
        filterElement.focus()
      }
    })
  }
  toggleSocketIO() {
    this.socketIOIsHidden = !this.socketIOIsHidden
  }
  toggleStomp() {
    this.stompIsHidden = !this.stompIsHidden
  }
  toggleBayeux() {
    this.bayeuxIsHidden = !this.bayeuxIsHidden
  }
  toggleProtobuf() {
    this.protobufIsHidden = !this.protobufIsHidden
  }
  toggleDNS() {
    this.dnsIsHidden = !this.dnsIsHidden
  }
  saveAsBookmark() {
    this.isEditing = false
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
    })
    localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks))
  }
  deleteBookmark(index: number) {
    this.bookmarks.splice(index, 1)
    localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks))
  }
  useBookmark(index: number) {
    const bookmark = this.bookmarks[index]
    this.isSocketIO = bookmark.isSocketIO
    this.ignorePing = bookmark.ignorePing
    this.showRaw = bookmark.showRaw
    this.showFormatted = bookmark.showFormatted
    this.message = bookmark.message
    this.baseUrl = bookmark.baseUrl
    const newParameters = JSON.stringify(bookmark.parameters)
    this.parameters = JSON.parse(newParameters)
    this.anchor = bookmark.anchor
    localStorage.setItem('baseUrl', bookmark.baseUrl)
    localStorage.setItem('parameters', newParameters)
    localStorage.setItem('anchor', bookmark.anchor)
    this.subprotocol = bookmark.subprotocol
    this.protobufContent = bookmark.protobufContent
    this.protobufTypePath = bookmark.protobufTypePath
    this.messageType = bookmark.messageType
    this.protocol = bookmark.protocol
    this.host = bookmark.host
    this.port = bookmark.port
    this.httpMethod = bookmark.httpMethod
    this.headers = bookmark.headers
    localStorage.setItem('headers', JSON.stringify(bookmark.headers))
  }
  setKeyOfParameter(index: number, e: KeyboardEvent) {
    this.parameters[index].key = (e.target as HTMLInputElement).value
    localStorage.setItem('parameters', JSON.stringify(this.parameters))
  }
  setKeyOfHeader(index: number, e: KeyboardEvent) {
    this.headers[index].key = (e.target as HTMLInputElement).value
    localStorage.setItem('headers', JSON.stringify(this.headers))
  }
  setKeyOfFormData(index: number, e: KeyboardEvent) {
    this.formDatas[index].key = (e.target as HTMLInputElement).value
  }
  setValueOfParameter(index: number, e: KeyboardEvent) {
    this.parameters[index].value = (e.target as HTMLInputElement).value
    localStorage.setItem('parameters', JSON.stringify(this.parameters))
  }
  setValueOfHeader(index: number, e: KeyboardEvent) {
    this.headers[index].value = (e.target as HTMLInputElement).value
    localStorage.setItem('headers', JSON.stringify(this.headers))
  }
  setValueOfFormData(index: number, e: KeyboardEvent) {
    const element = e.target as HTMLInputElement
    this.formDatas[index].value = element.files && element.files.length > 0 ? element.files[0] : element.value
  }
  setTypeOfFormData(index: number, e: KeyboardEvent) {
    this.formDatas[index].type = (e.target as HTMLSelectElement).value as 'text' | 'file'
  }
  deleteParameter(index: number) {
    this.parameters.splice(index, 1)
    localStorage.setItem('parameters', JSON.stringify(this.parameters))
  }
  deleteHeader(index: number) {
    this.headers.splice(index, 1)
    localStorage.setItem('headers', JSON.stringify(this.headers))
  }
  deleteFormData(index: number) {
    this.formDatas.splice(index, 1)
  }
  addParameter() {
    this.parameters.push({
      key: '',
      value: ''
    })
  }
  addHeader() {
    this.headers.push({
      key: '',
      value: ''
    })
  }
  addFormData() {
    this.formDatas.push({
      key: '',
      value: '',
      type: 'text'
    })
  }
  connect() {
    if (this.protocol === 'WebSocket') {
      try {
        this.websocket = this.subprotocol ? new WebSocket(this.url, this.subprotocol) : new WebSocket(this.url)
      } catch (error) {
        this.messages.unshift({
          moment: getNow(),
          type: 'error',
          reason: error.message,
          id: this.id++
        })
        return
      }

      this.websocket.binaryType = 'arraybuffer'
      this.websocket.onopen = this.onopen
      this.websocket.onclose = this.onclose
      this.websocket.onmessage = this.onmessage
      this.websocket.onerror = this.onerror
      if (this.isSocketIO) {
        pingId = setInterval(this.ping, 25000)
      }
    } else if (this.protocol === 'TCP') {
		 // zll
		 this.errorStatus = 502
		 this.isClosed = false
		 this.hasError()
		 this.serialNumber = new Date().getTime()
		 
      if (proxyWebSocket && !isNaN(+this.port)) {
        const protocol: types.Protocol = {
          kind: types.ProtocolKind.tcpConnect,
          host: this.host,
          port: +this.port
        }

        proxyWebSocket.send(JSON.stringify(protocol))
      }
    }
  }

  sendMessage() {
    this.send(this.message)
  }
  useStompConnectionMessage() {
    this.message = stompConnectionMessage
  }
  useStompSubscriptionMessage() {
    this.message = stompSubscriptionMessage
  }
  useStompSendMessage() {
    this.message = stompSendMessage
  }
  useSocketIOSendMessage() {
    this.message = socketIOSendMessage
  }
  useBayeuxHandshakeMessage() {
    this.message = bayeuxHandshakeMessage
  }
  useBayeuxSubscribeMessage() {
    this.message = bayeuxSubscribeMessage
  }
  useBayeuxPublishMessage() {
    this.message = bayeuxPublishMessage
  }
  useBayeuxPingMessage() {
    this.message = bayeuxPingMessage
  }
  clear() {
    this.messages = []
  }
  previewMessage() {
    this.isPreview = true
    if (this.protocol === 'WebSocket' && this.isSocketIO) {
      this.previewResult = ''
      previewDecoder.add(this.message)
    } else if (this.messageType === 'Uint8Array') {
      try {
        this.previewResult = new TextDecoder('utf-8').decode(new Uint8Array(this.message.split(',').map(m => +m)))
      } catch (error) {
        this.previewResult = error
      }
    } else {
      try {
        this.previewResult = JSON.stringify(JSON.parse(this.message), null, '    ')
      } catch (error) {
        this.previewResult = error
      }
    }
  }
  cancelPreview() {
    this.isPreview = false
  }
  showTips() {
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
    })
  }
  close() {
    this.messages.unshift({
      moment: getNow(),
      type: 'tips',
      tips: 'Is going to disconnect manually.',
      id: this.id++
    })
    if (this.protocol === 'WebSocket') {
      this.websocket!.close()
    } else if (this.protocol === 'TCP') {
      const protocol: types.Protocol = {
        kind: types.ProtocolKind.tcpDisconnect
      }
      proxyWebSocket.send(JSON.stringify(protocol))
    }
	
	clearTimeout(this.timer)
	this.isClosed = true
	this.errorStatus = 503
  }
  onmessage(e: MessageEvent) {
    this.onmessageAccepted(e.data, e.type)
  }
  toggleMessageVisibility(message: Message) {
    message.visible = !this.messageVisibility(message)
  }
  resultId(index: number) {
    return `result-${index}`
  }
  messageVisibility(message: Message) {
    return message.visible !== undefined
      ? message.visible
      : (message.formattedData ? this.showFormatted : this.showRaw)
  }
  visibilityButtonStyle(message: Message) {
    return {
      position: 'absolute',
      bottom: (this.messageVisibility(message) ? (10 + message.visibilityButtonExtraBottom!) : 0) + 'px',
      right: 10 + 'px'
    }
  }
  private showError(error: Error) {
    this.messages.unshift({
      moment: getNow(),
      type: 'error',
      reason: error.message,
      id: this.id++
    })
  }
  // tslint:disable-next-line:cognitive-complexity
  private send(message: string) {
    let data: string | Uint8Array |  undefined
    let isBinary = true

    if (this.messageType === 'Uint8Array') {
      //let test1 : number[] = [0x1];
      //test1 = this.message.split(' ').map(m => +m);
      //data = new Uint8Array(test1);

      //data = new Uint8Array(this.message.split('').map(m => +m))
      let str : string = this.message;
      var strs = str.split(' ');
      var out = new ArrayBuffer(strs.length);
      var u16a= new Uint8Array(out);
      for(var i =0, j = 0; i<strs.length;i++){
        u16a[j]=parseInt(strs[i], 16);
        j++;
      }
      data = u16a;

    } else if (this.messageType === 'protobuf') {
      if (this.protobufType) {
        try {
          data = this.protobufType.encode(JSON.parse(this.message)).finish()
        } catch (error) {
          this.messages.unshift({
            moment: getNow(),
            type: 'error',
            reason: error.message,
            id: this.id++
          })
          return
        }
      } else {
        this.messages.unshift({
          moment: getNow(),
          type: 'error',
          reason: 'Protobuf file content is not loaded.',
          id: this.id++
        })
        return
      }
    } else {
      data = (this.message)
      //data = strToHexCharCode(this.message)
      //data = this.message
      isBinary = false
    }

    let rawData: string | undefined
    let formattedData: string | undefined
    if (this.protocol === 'WebSocket') {
      if (this.websocket && data) {
        if (!(this.ignorePing && message === '2')) {
          rawData = message
          formattedData = data.toString()
        }
        this.websocket.send(data)
      }
    } else if (this.protocol === 'TCP') {
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
        const protocol: types.Protocol = {
          kind: types.ProtocolKind.tcpSend,
          isBinary,
          //message: str
          message: typeof data === 'string' ? data : data.toString()
        }
        formattedData = JSON.stringify(protocol, null, '  ')
        proxyWebSocket.send(JSON.stringify(protocol))
      }
    } else if (this.protocol === 'UDP') {
      if (proxyWebSocket) {
        if (!this.dnsIsHidden) {
          const request = new DNSMessage(this.dnsTransactionId)
          request.addQuestion(this.dnsQuestionName)
          formattedData = JSON.stringify(request, null, '  ')
          data = request.encode()
          isBinary = true
        }

        if (data) {
          const protocol: types.Protocol = {
            kind: types.ProtocolKind.udpSend,
            address: this.host,
            port: +this.port,
            isBinary,
            message: typeof data === 'string' ? data : data.toString()
          }
          if (!formattedData) {
            formattedData = JSON.stringify(protocol, null, '  ')
          }
          proxyWebSocket.send(JSON.stringify(protocol))
        }
      }
    } else if (this.protocol === 'HTTP') {
      const request = new XMLHttpRequest()
      request.onloadend = e => {
        this.onmessageAccepted(`${request.status} ${request.statusText}\n${request.getAllResponseHeaders()}`, '')
        this.onmessageAccepted(request.response, '')
      }
      request.upload.onprogress = e => {
        const percent = Math.round(e.loaded * 100 / e.total)
        this.onmessageAccepted(`${e.loaded} / ${e.total} (${percent}%)`, '')
      }
      if (this.useProxy) {
        request.open(this.httpMethod, '/proxy')
        request.setRequestHeader(toUrlHeaderName, this.url)
        request.setRequestHeader(headersName, JSON.stringify(this.headers.filter(h => h.key)))
      } else {
        request.open(this.httpMethod, this.url)
        for (const header of this.headers) {
          request.setRequestHeader(header.key, header.value)
        }
      }

      if (this.shouldContainBody) {
        if (this.messageType === 'FormData') {
          const formData = new FormData()
          for (const { key, value } of this.formDatas) {
            if (key) {
              formData.append(key, value)
            }
          }
          request.send(formData)
        } else {
          request.send(this.message)
        }
      } else {
        request.send()
      }
    } else if (this.protocol === 'WebRTC') {
      if (this.dataChannel) {
        rawData = message
        this.dataChannel.send(message)
      }
    }

    if (rawData) {
      this.messages.unshift({
        moment: getNow(),
        type: 'out',
        rawData,
        visible: undefined,
        visibilityButtonExtraBottom: 0,
        isBinary,
        id: this.id++
      })
    }

    if (formattedData) {
      this.messages.unshift({
        moment: getNow(),
        type: 'out',
        formattedData,
        visible: undefined,
        visibilityButtonExtraBottom: 0,
        isBinary,
        id: this.id++
      })
    }
  }
  private ping() {
    this.send('2')
  }
  private onopen(e: Event) {
    this.messages.unshift({
      moment: getNow(),
      type: e.type,
      id: this.id++
    })
  }
  private onclose(e: CloseEvent) {
    this.messages.unshift({
      moment: getNow(),
      type: e.type,
      reason: e.reason,
      id: this.id++
    })
    this.websocket = null
    clearInterval(pingId)
	
  }
  // tslint:disable-next-line:cognitive-complexity
  private onmessageAccepted(eventData: any, eventType: string) {
    if (this.ignorePing && eventData === '3') {
      return
    }

    const isBinary = typeof eventData !== 'string'

    if (eventData === '3') {
      this.messages.unshift({
        moment: getNow(),
        type: eventType,
        data: eventData,
        isBinary,
        id: this.id++
      })
      return
    }

    const type = 'in'
    let typedArray: Uint8Array | undefined
    let rawData: string
    let status: string
    if (isBinary) {
      typedArray = new Uint8Array(eventData)
      let num: number
      let strtypedArray: string = ' '
      for(let i = 0; i < typedArray.length; i++) {
        num = typedArray[i]
        strtypedArray += PrefixInteger(num.toString(16), 2) + ' '
      }

      rawData = strtypedArray

      status = 'in'
    } else {
      typedArray = undefined
      rawData = eventData
      if (rawData.includes('disconnected')) {
        status = 'disconnect'
      } else {
        status = 'connect'
      }
    }
    this.messages.unshift({
      moment: getNow(),
      type: status,
      rawData,
      visible: undefined,
      visibilityButtonExtraBottom: 0,
      isBinary,
      id: this.id++
    })

    if (this.protocol === 'WebSocket' && this.isSocketIOInternally) {
      decoder.add(eventData)
    } else if (!isBinary) {
      try {
        const protocol: types.Protocol = JSON.parse(eventData)
        if (this.protocol !== 'WebSocket') {
          if (protocol.kind === types.ProtocolKind.tcpConnected) {
            this.tcpConnected = true
          } else if (protocol.kind === types.ProtocolKind.tcpDisconnected) {
            this.tcpConnected = false
          }
        }

        if (this.tcpConnected) {
          this.messages.unshift({
            moment: getNow(),
            type: 'connect',
            formattedData: JSON.stringify(protocol, null, '    '),
            isBinary,
            visible: undefined,
            visibilityButtonExtraBottom: 0,
            id: this.id++
          })
        } else {
          this.messages.unshift({
            moment: getNow(),
            type: 'disconnect',
            formattedData: JSON.stringify(protocol, null, '    '),
            isBinary,
            visible: undefined,
            visibilityButtonExtraBottom: 0,
            id: this.id++
          })
        }
      } catch (error) {
        printInConsole(error)
      }
    } else {
      try {
        const formattedData = new TextDecoder('utf-8').decode(typedArray!)
        this.messages.unshift({
          moment: getNow(),
          type: 'in',
          formattedData,
          isBinary,
          visible: undefined,
          visibilityButtonExtraBottom: 0,
          id: this.id++
        })
      } catch (error) {
        printInConsole(error)
      }

      if (this.protobufType) {
        try {
          const object = this.protobufType.toObject(this.protobufType.decode(typedArray!))
          this.messages.unshift({
            moment: getNow(),
            type,
            formattedData: JSON.stringify(object, null, '    '),
            isBinary,
            visible: undefined,
            visibilityButtonExtraBottom: 0,
            id: this.id++
          })
        } catch (error) {
          printInConsole(error)
        }
      } else if (!this.dnsIsHidden && typedArray) {
        try {
          const object = DNSMessage.parse(typedArray.buffer as ArrayBuffer)
          this.messages.unshift({
            moment: getNow(),
            type,
            formattedData: JSON.stringify(object, null, '    '),
            isBinary,
            visible: undefined,
            visibilityButtonExtraBottom: 0,
            id: this.id++
          })
        } catch (error) {
          printInConsole(error)
        }
      }
    }
  }
  private onerror(e: Event) {
    this.messages.unshift({
      moment: getNow(),
      type: e.type,
      id: this.id++
    })
    this.websocket = null
    clearInterval(pingId)
  }
  private showLocalDescription() {
    this.messages.unshift({
      moment: getNow(),
      type: 'tips',
      tips: JSON.stringify(this.peerConnection!.localDescription!.toJSON()),
      id: this.id++
    })
  }
}



const app = new App({
  el: '#body'
})

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
  })
}

decoder.on('decoded', decodedPacket => {
  app.messages.unshift({
    moment: getNow(),
    type: 'in',
    formattedData: JSON.stringify(decodedPacket, null, '    '),
    visible: undefined,
    visibilityButtonExtraBottom: 0,
    id: app.id++
  })
})

previewDecoder.on('decoded', decodedPacket => {
  app.previewResult = JSON.stringify(decodedPacket, null, '    ')
})

window.onscroll = () => {
  const innerHeight = (window.innerHeight || document.documentElement.clientHeight)
  for (let i = 0; i < app.messages.length; i++) {
    const message = app.messages[i]
    const element = document.getElementById(app.resultId(i))
    if (element) {
      const rect = element.getBoundingClientRect()
      message.visibilityButtonExtraBottom = (rect.top < innerHeight - 40 && rect.top + rect.height > innerHeight)
        ? (rect.top + rect.height - innerHeight) : 0
    }
  }
}

const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
proxyWebSocket = new WebSocket(`${wsProtocol}//${location.host}`)
proxyWebSocket.binaryType = 'arraybuffer'
proxyWebSocket.onmessage = event => {
  app.onmessage(event)
}
proxyWebSocket.onerror = event => {
  printInConsole(event)
  app.useProxy = false
}

if (navigator.serviceWorker && !location.host.startsWith('localhost')) {
  navigator.serviceWorker.register('service-worker.bundle.js').catch(error => {
    printInConsole('registration failed with error: ' + error)
  })
}

function printInConsole(message: any) {
  console.log(message)
}
