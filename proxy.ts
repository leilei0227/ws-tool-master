import * as express from 'express'
import { Server as WebSocketServer } from 'uws'
import * as http from 'http'
import * as net from 'net'
import * as dgram from 'dgram'
import fetch from 'node-fetch'
import * as types from './types'
import * as compression from 'compression'
import * as bodyParser from 'body-parser'
import * as errorMsgHandler from './errorMsgHandler'

const server = http.createServer()
const wss = new WebSocketServer({ server })
const app = express()

// 添加json解析
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/', express.static(__dirname))
app.disable('x-powered-by')
app.use(compression())
const toUrlHeaderName = 'x-to-url'
const headersName = 'x-headers'

app.all('/proxy', (request, proxyResponse) => {
  ////console.log('/proxy')
  const url = request.header(toUrlHeaderName) as string
  //console.log(url)
  if (!url) {
    proxyResponse.send(`No header: ${toUrlHeaderName}`)
  } else {
    const chunks: Buffer[] = []
    request.on('data', chunk => {
      chunks.push(chunk as Buffer)
    })
    request.on('end', () => {
      const headerString = request.header(headersName) as string
      if (!headerString) {
        return
      }
      const headerArray: types.Header[] = JSON.parse(headerString)
      const headers: { [name: string]: string } = {}
      for (const header of headerArray) {
        headers[header.key] = header.value
      }
      fetch(url, {
        headers,
        body: Buffer.concat(chunks),
        method: request.method,
        compress: false
      }).then(response => {
        response.headers.forEach((value, name) => {
          proxyResponse.setHeader(name, value)
        })
        response.buffer().then(buffer => {
          proxyResponse.status(response.status).send(buffer)
        }, (error: Error) => {
          proxyResponse.status(response.status).send(error.message)
        })
      }, (error: Error) => {
        proxyResponse.send(error.message)
      })
    })
  }
})

app.post('/saveErrorMsg', function (req, res) {
	console.log(req.body);
	errorMsgHandler.add(req.body, function(err) {
		if (err) {
			res.json({
				status: 400,
				msg: '保存数据失败'
			})
		} else{
			res.json({
				status: 200,
				msg: '保存数据成功'
			});
		}
	
	})
	
})

app.get('/getErrorMsg', function (req, res) {
	errorMsgHandler.get(req.query.currentPage, req.query.pageSize,req.query.serialNumber,function(err, result) {
		if (err) {
			res.json({
				status: 400,
				msg: '获取数据失败'
			})
		} else {
			res.json({
				status: 200,
				msg: '获取数据成功',
				data: result.data,
				total: result.total,
				currentPage:req.query.currentPage,
				pageSize: req.query.pageSize
			});
		}
		
	})
	
})


wss.on('connection', ws => {
  let tcpClient: net.Socket | undefined
  const udpClient = dgram.createSocket('udp4')
  //console.log('connection')
  udpClient.on('message', (msg: Buffer, rinfo: dgram.AddressInfo) => {
    //console.log('msg', msg)
	ws.send(msg)
  })

  ws.on('message', data => {
	  //console.log('data', data)
    const protocol: types.Protocol = JSON.parse(data)
    if (protocol.kind === types.ProtocolKind.tcpConnect) {
      if (tcpClient) {
        tcpClient.destroy()
      }
      tcpClient = net.connect(protocol.port, protocol.host, () => {
        const responseProtocol: types.Protocol = {
          kind: types.ProtocolKind.tcpConnected
        }
        ws.send(JSON.stringify(responseProtocol))
      })
      tcpClient.on('close', hadError => {
        const responseProtocol: types.Protocol = {
          kind: types.ProtocolKind.tcpDisconnected
        }
        ws.send(JSON.stringify(responseProtocol))
      })
      tcpClient.on('error', error => {
        ws.send(`errored: ${error.stack}`)
      })
      tcpClient.on('timeout', () => {
        ws.send('timeout')
      })
      tcpClient.on('data', (tcpData: Buffer) => {
		  //console.log('tcpData', tcpData)
        ws.send(tcpData, { binary: true })
      })
    } else if (protocol.kind === types.ProtocolKind.tcpDisconnect) {
      if (tcpClient) {
        tcpClient.destroy()
      }
    } else if (protocol.kind === types.ProtocolKind.tcpSend) {
      if (tcpClient) {
        const message = protocol.isBinary ? new Buffer(protocol.message.split(',')) : protocol.message
        tcpClient.write(message)
      }
    } else if (protocol.kind === types.ProtocolKind.udpSend) {
      const message = protocol.isBinary ? new Buffer(protocol.message.split(',')) : protocol.message
      udpClient.send(message, protocol.port, protocol.address)
    }
  })
})

server.on('request', app)

const port = 12345
server.listen(port, () => {
  console.log(`The proxy is running, and listening: ${port}`)
})
