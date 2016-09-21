var welcome = function() {
	return this;
};
var conf = {
	'index' : function(param){
		var data = {
			'godness': '/preg-wish/index?mvc=1'
		},
		self = this;
		this.setData(data);
		this.listen(function(data){
			//console.log('hello ,today is a fine day');  //这里日志能够成功打印到日志文件啦
			self.cssLink = ['welcome'];
			data.name = '好吧q j 我是一只小小鸟怎么飞也飞不高';
			return self.render('welcome', data);
		});
	}
};
exports.__create = controller.__create(welcome, conf);