# ws-tool

用于工控平台485链路诊断。

## features

+ 完成了错误记录和显示

+ ```bash
  #链路状态种类：
  private errorObj: any = {
  	  "200": "通讯正常",
  	  "401": "主站通讯故障",
  	  "402": "主站故障",
  	  "403": "从站故障",
  	  "501": "未连接",
  	  "502": "已连接",
  	  "503": "已断开"
    }
  ```

## build

项目构建

```bash
npm run build
```
**proxy.ts需要单独编译**
```bash
tsc proxy.ts
```

## install

数据库

```bash
CREATE TABLE `tcp_errmsgs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `moment` varchar(40) NOT NULL,
  `mainPack` varchar(200) NOT NULL,
  `subPack` varchar(200) NOT NULL,
  `msgStatus` varchar(100) NOT NULL,
  `serialNumber` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8;
```

启动

```bash
node proxy.js
```

访问网址

```bash
http://106.12.153.196:12345/?host=b1949h4088.zicp.vip&port=35309&main=55%2055%2020%2002%2000%2022&sub=55%2055%2020%2002%2017
#host:IP地址
#port：端口号
#main：主站报文
#sub:从站报文
```

## 文件信息

主要更改的文件

+ index.ts：前端js
+ app.template.html：前端主要内容html
+ index.ejs.html：前端html框架
+ index.css：前端css
+ proxy.ts：后端服务
+ errorMsgHandler.js：把错误存到数据库