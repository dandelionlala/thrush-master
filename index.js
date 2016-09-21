//开始服务启动计时器
console.time('[WebSvr][Start]');

//请求模块
global.libHttp = require('http');    //HTTP协议模块
var libUrl=require('url');    //URL解析模块
global.libFs = require("fs");    //文件系统模块
var libPath = require("path");    //路径解析模块
global.controller = require("./controller.js"); 
global.tmp = require('./etic.js');
var contentType = require("./contentType");
var wrapJS = require('./jsserver/commonJS.js').wrapJS;
var config = require('./jsserver/config/service.json');
var less = config.less ? require(config.less) : null;
var RESEXPIRE = config.max_time;
libFs.writeFileSync('./jsserver/config/pid',process.pid);

//Web服务器主函数,解析请求,返回Web内容
var funWebSvr = function (req, res){
	var date = new Date(),
		logFilePath = '';
	try{
		var currMonth = date.getMonth() + 1;
		var currDay = date.getDate();
		var strMonth = currMonth < 10 ? ('0' + currMonth) : '' + currMonth;
		var strDay = currDay < 10 ? ('0' + currDay) : '' + currDay;
		logFilePath = './tmp/log/thrush/' + date.getUTCFullYear() + '/' + strMonth + '/' + strDay + '.log';
		
	}catch(e){
		console.log(e);
	}
	//获取请求的url
	var reqUrl = req.url; 
	req.logUrl = logFilePath;

	//使用url解析模块获取url中的路径名
	var pathName = libUrl.parse(reqUrl).pathname;
	var suffix = pathName.match(/\.([^\/]*$)/);
	if (suffix) {
		var suffixType = '';
		if (suffix[1] == 'jpg' || suffix[1] == 'png' || suffix[1] == 'gif') {
			suffixType = 'img';
		}else{
			suffixType = suffix[1];
		}
		var _statics = './statics/' + suffixType + pathName;
		if (libFs.existsSync(_statics)) {
			res.writeHead(200, {"Content-Type": contentType.funGetContentType(suffixType)});
			if(suffixType == 'css'){
				_statics = _statics.replace('/css/', '/less/').replace('.css','.less')
				suffixType = 'less';
			}
			var timer = setTimeout ( function() {
				console.log('compile timeout ' , _statics.substr(1));
				res.end();
			} , RESEXPIRE);

			loadFile(res, suffixType, _statics, function(){
				clearTimeout(timer);
			});
		}else{
			onErr(_statics.substr(1), res);
			return;
		}
		return;
	}
	var pathClear = pathName.substr(1);
	if (pathClear == '') {
		pathClear = 'welcome';
	};
	var pathArr = pathClear.replace(/\/+/g,'/').split('/');
	if(pathArr.length < 3){
		pathArr.splice(1,0,'index');
	}
	var mods = pathArr.splice(-3);
	var modPath = 'www/controller/' + (pathArr.length ? pathArr.join('/')+'/' : '');
	var modName = mods[0] + '.js';
	var modPathFile = modPath + modName;
	try{
		if (libFs.existsSync(modPathFile)) {
			render200(require('./' + modPathFile), req, res, mods);
		}
		else{
			onErr(modPathFile, res);
			return;
		}
	}catch(ex){
		console.log(ex.stack);
	}	
}
var loadFile = function(res, fileType, filePath, onReady){	
	if(fileType == 'js'){
		onReady();
		res.end(wrapJS(filePath),'utf-8');
	}else{
		if(less && fileType == 'less'){						
		 	libFs.readFile(filePath ,'utf-8',function(err, file){
		 		if(err){
					onErr(filePath, res);
					return;
				}
				onReady();
				less.render(file,{
				  paths: [filePath.substr(0 , filePath.lastIndexOf('/'))] // Specify search paths for @import directives
				}, function (err, css) {
					if(err){
						console.log(err);
						res.end();
						return;
					}
				  	res.end(css.css,'utf-8');
				})
		 	});
		}else{
			libFs.readFile(filePath, function(err, file){
				if(err){
					onErr(filePath, res);
					return;
				}
				onReady();
				res.end(file, 'utf-8');
			});
		}				
	}
}
var render200 = function(model, req, res, mods){
	var modObj = new model.__create();
	var fn = mods[1];
    var param = mods.length == 3 ? mods[2] : null;
    if (param) {
		try {
			param = decodeURIComponent(param);
		} catch(err) {
			console.log(err, param);
		}
	}
	modObj.res = res;
	modObj.req = req;
	try{
		var exeMod = function(){
			if(modObj[fn]){
				modObj[fn](param);
			}
			else{
				console.log('not assign');
				res.writeHead(404 , {'Content-Type' : 'text/plain'});        
			    res.end('not assign.');
			}
		}

		modObj.req.__get = {};
		modObj.req.__post = {};
		if(req.method == "GET"){
	        var params = [];
	        params = libUrl.parse(req.url,true).query;
	        modObj.req.__get = params;
	        exeMod();
	    }else if(req.method == "POST"){
	        var postdata = "";
	        req.addListener("data",function(postchunk){
	            postdata += postchunk;
	        })

	        //POST结束输出结果
	        req.addListener("end",function(){
	            var params = querystring.parse(postdata);
	            modObj.req.__post = params;
	            exeMod();
	        })
	    }else{
	    	exeMod();
	    }

	}catch(ex){
		console.log(ex.stack);
	}
}
var onErr = function(filepath ,res){
   res.writeHead( 404 ,{'Content-Type' : 'text/plain'}); 
   res.write( filepath + ' is lost');
   res.end();
   console.log(filepath,' is lost');
};


//创建一个http服务器
var webSvr = libHttp.createServer(funWebSvr);

//指定服务器错误事件响应
webSvr.on("error", function(error) { 
	console.log(error);  //在控制台中输出错误信息
}); 

//开始侦听8124端口
webSvr.listen(8124,function(){

	//向控制台输出服务启动的信息
	console.log('[WebSvr][Start] running at http://127.0.0.1:8124/'); 

	//结束服务启动计时器并输出
	console.timeEnd('[WebSvr][Start]');
});

var watcher = require("./watchFile.js");
var absDir = __dirname.replace(/\\/g,'/') + '/www/controller';
watcher.takeCare([absDir] );